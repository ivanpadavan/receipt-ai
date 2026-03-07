import { multiplyMoney } from "@/app/receipt/utils/money";
import { getExpectedReceiptTotals } from "@/model/receipt/math";
import { positionAiSchema, receiptAiSchema } from "@/model/receipt/schema-structural";
import { z } from "zod";

export const addPositionBusinessIssues = (
  value: z.infer<typeof positionAiSchema>,
  context: z.RefinementCtx,
  pathPrefix: (string | number)[] = [],
) => {
  const calculatedOverall = multiplyMoney(value.price, value.quantity);
  if (Math.abs(calculatedOverall - value.overall) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...pathPrefix, "overall"],
      message: "Overall must match quantity * price",
    });
  }
};

export const addReceiptTotalsBusinessIssues = (
  value: Pick<z.infer<typeof receiptAiSchema>, "positions" | "fees" | "discounts" | "totals">,
  context: z.RefinementCtx,
) => {
  const expectedTotals = getExpectedReceiptTotals(value);
  if (Math.abs(expectedTotals.total - value.totals.total) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totals", "total"],
      message: "Totals.total must match positions overall sum",
    });
  }

  if (Math.abs(expectedTotals.grandTotal - value.totals.grandTotal) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totals", "grandTotal"],
      message: "Totals.grandTotal must match total + fees - discounts",
    });
  }
};

export const addReceiptBusinessIssues = (
  value: z.infer<typeof receiptAiSchema>,
  context: z.RefinementCtx,
) => {
  value.positions.forEach((position, index) => {
    addPositionBusinessIssues(position, context, ["positions", index]);
  });

  addReceiptTotalsBusinessIssues(value, context);
};
