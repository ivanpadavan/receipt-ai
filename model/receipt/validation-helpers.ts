import { t } from "@/app/i18n/translations";
import { multiplyMoney } from "@/app/receipt/utils/money";
import { getExpectedReceiptTotals } from "@/model/receipt/math";
import { positionAiSchema, receiptAiSchema } from "@/model/receipt/schema-structural";
import { z } from "zod";

export const addPositionMathIssues = (
  value: z.infer<typeof positionAiSchema>,
  context: z.RefinementCtx,
  pathPrefix: (string | number)[] = [],
) => {
  const calculatedOverall = multiplyMoney(value.price, value.quantity);
  if (Math.abs(calculatedOverall - value.overall) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...pathPrefix, "overall"],
      message: t("validationOverallMatchesQuantityPrice"),
    });
  }
};

export const addReceiptTotalsMathIssues = (
  value: Pick<z.infer<typeof receiptAiSchema>, "positions" | "fees" | "discounts" | "totals">,
  context: z.RefinementCtx,
) => {
  const expectedTotals = getExpectedReceiptTotals(value);
  if (Math.abs(expectedTotals.total - value.totals.total) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totals", "total"],
      message: `${t("validationTotalMismatchPrefix")} ${value.totals.total} ${t("validationTotalMismatchSuffix")} (${expectedTotals.total})`,
    });
  }

  if (Math.abs(expectedTotals.grandTotal - value.totals.grandTotal) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totals", "grandTotal"],
      message: `${t("validationGrandTotalExpectedPrefix")} ${expectedTotals.grandTotal}`,
    });
  }
};

export const addReceiptMathIssues = (
  value: z.infer<typeof receiptAiSchema>,
  context: z.RefinementCtx,
) => {
  value.positions.forEach((position, index) => {
    addPositionMathIssues(position, context, ["positions", index]);
  });

  addReceiptTotalsMathIssues(value, context);
};
