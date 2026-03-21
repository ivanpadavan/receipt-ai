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
    "{contextBlock}" +
    "Business validation issues:\n{errors}\n" +
    "Fix the result and return corrected structured output.\n" +
    "{instructions}",
);

export interface RepairPromptInput {
  result: unknown;
  errors: string;
  context?: string;
}

export interface RepairContextSection {
  title: string;
  content: string;
}

export function buildRepairContext(sections: RepairContextSection[]) {
  return sections
    .map((section) => ({
      title: section.title.trim(),
      content: section.content.trim(),
    }))
    .filter((section) => section.title.length > 0 && section.content.length > 0)
    .map((section) => `${section.title}:\n${section.content}`)
    .join("\n\n");
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

export function createBusinessRepairChain<TSchema extends z.ZodTypeAny>(
  model: StructuredOutputModel,
  params: {
    schema: TSchema;
    name: string;
    instructions: string;
  },
) {
  const outputModel = model.withStructuredOutput(params.schema, {
    name: params.name,
  });

  return {
    invoke: async (input: RepairPromptInput): Promise<z.infer<TSchema>> => {
      const prompt = await businessRepairPrompt.format({
        ...input,
        contextBlock: input.context
          ? `Original generation context:\n${input.context}\n`
          : "",
        instructions: params.instructions,
      });
      const raw = await outputModel.invoke(prompt);
      return params.schema.parse(raw);
    },
  };
}

interface RepairWithBusinessValidationParams<TState, TRepairOutput> {
  result: TState;
  getReceipt: (value: TState) => z.infer<typeof receiptAiSchema>;
  setReceipt: (
    value: TState,
    receipt: z.infer<typeof receiptAiSchema>,
  ) => TState;
  repairChain: {
    invoke: (input: RepairPromptInput) => Promise<TRepairOutput>;
  };
  parseRepaired: (value: TRepairOutput) => z.infer<typeof receiptAiSchema>;
  repairContext?: string;
  telemetry?: {
    label: string;
    meta?: Record<string, string | number | boolean | null>;
  };
  maxAttempts?: number;
}

export async function repairWithBusinessValidation<TState, TRepairOutput>({
  result: initialResult,
  getReceipt,
  setReceipt,
  repairChain,
  parseRepaired,
  repairContext,
  telemetry,
  maxAttempts = 3,
}: RepairWithBusinessValidationParams<TState, TRepairOutput>) {
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

  let result = initialResult;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const issues = getReceiptBusinessValidationIssues(getReceipt(result));
    if (issues.length === 0) {
      logTelemetry(attempts === 0 ? "no_issues" : "repaired", {
        attempts,
      });
      return result;
    }
    logTelemetry("attempt", {
      attempt: attempts + 1,
      issueCount: issues.length,
    });

    const repaired = await repairChain.invoke({
      result,
      errors: formatReceiptBusinessValidationIssues(issues),
      context: repairContext,
    });
    result = setReceipt(result, parseRepaired(repaired));
    attempts++;
  }

  const issues = getReceiptBusinessValidationIssues(getReceipt(result));
  logTelemetry("failed", {
    attempts,
    issueCount: issues.length,
  });

  return result;
}
