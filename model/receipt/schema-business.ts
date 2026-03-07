import { receiptAiSchema } from "@/model/receipt/schema-structural";
import { addReceiptBusinessIssues } from "@/model/receipt/validation-helpers";

export const receiptBusinessSchema = receiptAiSchema
  .superRefine((value, context) => {
    addReceiptBusinessIssues(value, context);
  })
  .describe("Structured data extracted from the receipt");
