import { receiptAiSchema } from "@/model/receipt/schema-structural";
import { receiptMathSchema } from "@/model/receipt/schema-math";
import { z } from "zod";

export interface ReceiptMathValidationIssue {
  path: (string | number)[];
  message: string;
}

export function getReceiptBusinessValidationIssues(
  value: z.infer<typeof receiptAiSchema>,
): ReceiptMathValidationIssue[] {
  const validation = receiptMathSchema.safeParse(value);
  if (validation.success) {
    return [];
  }

  return validation.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
}

export function formatReceiptBusinessValidationIssues(
  issues: ReceiptMathValidationIssue[],
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
