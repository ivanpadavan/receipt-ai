import { z } from "zod";
import {
  Receipt,
  getExpectedReceiptTotals,
} from "@/model/receipt/model";
import {
  addReceiptTotalsBusinessIssues,
  modifierSchema,
  positionAiSchema,
  addPositionBusinessIssues,
  receiptSchema,
  receiptTotalsSchema,
} from "@/model/receipt/schema";
import { t } from "@/app/i18n/translations";
import { addMoney } from "@/app/receipt/utils/money";

const localizePositionIssue = (issue: z.ZodIssue) => {
  const field = issue.path[0];
  if (field === "name") return t("validationNameRequired");
  if (field === "price") return t("validationPricePositive");
  if (field === "quantity") return t("validationQuantityPositive");
  if (field === "overall") {
    return issue.code === z.ZodIssueCode.custom
      ? t("validationOverallMatchesQuantityPrice")
      : t("validationOverallPositive");
  }
  return issue.message;
};

const localizeModifierIssue = (issue: z.ZodIssue) => {
  const field = issue.path[0];
  if (field === "name") return t("validationNameRequired");
  if (field === "value") return t("validationModifierValuePositive");
  return issue.message;
};

const localizeTotalsIssue = (
  issue: { path?: (string | number)[]; message?: string },
  receipt: Receipt,
  total: number,
) => {
  const expectedTotals = getExpectedReceiptTotals(receipt, total);
  if (issue.path?.[0] === "total") {
    return `${t("validationTotalMismatchPrefix")} ${total} ${t("validationTotalMismatchSuffix")} (${expectedTotals.total})`;
  }
  if (issue.path?.[0] === "grandTotal") {
    return `${t("validationGrandTotalExpectedPrefix")} ${expectedTotals.grandTotal}`;
  }
  return issue.message ?? "";
};

export const editablePositionValidationSchema = z.any().superRefine(
  (value, context) => {
    const baseValidation = positionAiSchema.safeParse(value);
    if (!baseValidation.success) {
      baseValidation.error.issues.forEach((issue) => {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: issue.path,
          message: localizePositionIssue(issue),
        });
      });
      return;
    }

    addPositionBusinessIssues(value, {
      addIssue: (issue) =>
        context.addIssue({
          ...issue,
          message: t("validationOverallMatchesQuantityPrice"),
        }),
    } as z.RefinementCtx);
  },
);

export const editableModifierSchema = z.any().superRefine((value, context) => {
  const validation = modifierSchema.safeParse(value);
  if (validation.success) return;

  validation.error.issues.forEach((issue) => {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: issue.path,
      message: localizeModifierIssue(issue),
    });
  });
});

const editableTotalsSchema = z.any();

export const createEditableTotalsSchema = (receipt: Receipt) =>
  editableTotalsSchema.superRefine((value, context) => {
    const baseValidation = receiptTotalsSchema.safeParse(value);
    if (!baseValidation.success) {
      baseValidation.error.issues.forEach((issue) => {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: issue.path,
          message:
            issue.path[0] === "total"
              ? t("validationTotalPositive")
              : t("validationGrandTotalPositive"),
        });
      });
      return;
    }

    addReceiptTotalsBusinessIssues(
      {
        positions: receipt.positions,
        fees: receipt.fees,
        discounts: receipt.discounts,
        totals: value,
      },
      {
        addIssue: (issue) =>
          context.addIssue({
            ...issue,
            message: localizeTotalsIssue(issue, receipt, value.total),
          }),
      } as z.RefinementCtx,
    );
  });

export const receiptValidationSchema = receiptSchema.superRefine((value: Receipt, context) => {
    value.positions.forEach((position, index) => {
      const nonEmptyClaims = position.claims.filter((claim) => claim.value > 0);
      if (nonEmptyClaims.length === 0) return;

      const quantityClaimsTotal = nonEmptyClaims
        .filter((claim) => claim.type === "quantity")
        .reduce((acc, claim) => acc + claim.value, 0);

      if (quantityClaimsTotal - position.quantity > 0.01) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions", index, "claims"],
          message: t("validationClaimedQuantityExceeds"),
        });
      }

      const amountClaimsTotal = nonEmptyClaims
        .filter((claim) => claim.type === "amount")
        .reduce((acc, claim) => addMoney(acc, claim.value), 0);

      if (amountClaimsTotal - position.overall > 0.01) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions", index, "claims"],
          message: t("validationClaimedAmountExceeds"),
        });
      }
    });

  });
