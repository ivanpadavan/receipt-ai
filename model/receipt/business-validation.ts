import { receiptAiSchema } from "@/model/receipt/schema-structural";
import { receiptBusinessSchema } from "@/model/receipt/schema-business";
import { z } from "zod";

export type ReceiptBusinessValidationIssue = {
  path: (string | number)[];
  message: string;
};

export function validateReceiptBusiness(value: z.infer<typeof receiptAiSchema>) {
  return receiptBusinessSchema.safeParse(value);
}

export function getReceiptBusinessValidationIssues(
  value: z.infer<typeof receiptAiSchema>,
): ReceiptBusinessValidationIssue[] {
  const validation = validateReceiptBusiness(value);
  if (validation.success) {
    return [];
  }

  return validation.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
}

export function formatReceiptBusinessValidationIssues(
  issues: ReceiptBusinessValidationIssue[],
) {
  if (issues.length === 0) {
    return "";
  }

  return issues
    .map(
      (issue) =>
        `- ${issue.path.map((part) => String(part)).join(".")}: ${issue.message}`,
    )
    .join("\n");
}
