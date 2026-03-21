import { PromptTemplate } from "@langchain/core/prompts";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { z } from "zod";
import {
  formatReceiptBusinessValidationIssues,
  getReceiptBusinessValidationIssues,
} from "@/model/receipt/business-validation";
import { receiptAiSchema } from "@/model/receipt/schema-structural";

const businessRepairPrompt = PromptTemplate.fromTemplate(
  "There is a structured receipt result: {result}\n" +
    "Original prompt:\n{prompt}\n" +
    "Business validation issues:\n{errors}\n" +
    "Fix the result and return corrected structured output.",
);

export interface RepairPromptInput {
  result: unknown;
  prompt: string;
  errors: string;
}

interface StructuredOutputInvoker {
  invoke: (input: BaseLanguageModelInput) => Promise<unknown>;
}

export interface StructuredOutputModel {
  withStructuredOutput: <TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    options: { name: string },
  ) => StructuredOutputInvoker;
}

interface RepairWithBusinessValidationParams<TSchema extends z.ZodTypeAny> {
  receipt: z.infer<typeof receiptAiSchema>;
  model: StructuredOutputModel;
  schema: TSchema;
  prompt: string;
  telemetry?: {
    label: string;
    meta?: Record<string, string | number | boolean | null>;
  };
  maxAttempts?: number;
}

export async function repairWithBusinessValidation<
  TSchema extends z.ZodTypeAny,
>({
  receipt: initialReceipt,
  model,
  schema,
  prompt,
  telemetry,
  maxAttempts = 3,
}: RepairWithBusinessValidationParams<TSchema>) {
  const outputModel = model.withStructuredOutput(schema, {
    name: "receipt_business_repair",
  });

  const logTelemetry = (
    status: "no_issues" | "attempt" | "repaired" | "failed",
    details: Record<string, number> = {},
  ) => {
    if (!telemetry) return;
    console.info("receipt_business_repair", {
      label: telemetry.label,
      ...telemetry.meta,
      status,
      ...details,
    });
  };

  let receipt = initialReceipt;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const issues = getReceiptBusinessValidationIssues(receipt);
    if (issues.length === 0) {
      logTelemetry(attempts === 0 ? "no_issues" : "repaired", {
        attempts,
      });
      return receipt;
    }
    logTelemetry("attempt", {
      attempt: attempts + 1,
      issueCount: issues.length,
    });
    const errors = formatReceiptBusinessValidationIssues(issues);
    const repairPromptText = await businessRepairPrompt.format({
      result: receipt,
      prompt,
      errors,
    });

    const raw = await outputModel.invoke(repairPromptText);
    receipt = schema.parse(raw);
    attempts++;
  }

  const issues = getReceiptBusinessValidationIssues(receipt);
  logTelemetry("failed", {
    attempts,
    issueCount: issues.length,
  });

  return receipt;
}
