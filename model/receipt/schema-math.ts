import { receiptAiSchema } from "@/model/receipt/schema-structural";
import { addReceiptMathIssues } from "@/model/receipt/validation-helpers";

export const receiptMathSchema = receiptAiSchema
  .superRefine((value, context) => {
    addReceiptMathIssues(value, context);
  })
  .describe("Structured data extracted from the receipt");
