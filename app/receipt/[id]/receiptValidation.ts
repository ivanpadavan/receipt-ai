import { z } from "zod";
import {
  Receipt,
  calculateGrandTotal,
  calculateTotal,
} from "@/model/receipt/model";
import { receiptSchema } from "@/model/receipt/schema";
import { t } from "@/app/i18n/translations";

const editablePositionBaseSchema = z.object({
  name: z.string().trim().min(1, t("validationNameRequired")),
  price: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      t("validationPricePositive"),
    ),
  quantity: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      t("validationQuantityPositive"),
    ),
  overall: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      t("validationOverallPositive"),
    ),
});

export const editablePositionValidationSchema =
  editablePositionBaseSchema.superRefine((value, context) => {
    const calculatedOverall = value.price * value.quantity;
    if (Math.abs(calculatedOverall - value.overall) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overall"],
        message: t("validationOverallMatchesQuantityPrice"),
      });
    }
  });

export const editableModifierSchema = z.object({
  name: z.string().trim().min(1, t("validationNameRequired")),
  value: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      t("validationModifierValuePositive"),
    ),
});

export const editableTotalsSchema = z.object({
  total: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      t("validationTotalPositive"),
    ),
  grandTotal: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      t("validationGrandTotalPositive"),
    ),
});

export const createEditableTotalsSchema = (receipt: Receipt) =>
  editableTotalsSchema.superRefine((value, context) => {
    const calculatedTotal = calculateTotal(receipt.positions);
    if (Math.abs(calculatedTotal - value.total) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total"],
        message: `${t("validationTotalMismatchPrefix")} ${value.total} ${t("validationTotalMismatchSuffix")} (${calculatedTotal})`,
      });
    }

    const modifiersDelta =
      receipt.fees.reduce((acc, fee) => acc + fee.value, 0) -
      receipt.discounts.reduce((acc, discount) => acc + discount.value, 0);
    const expectedGrandTotal = value.total + modifiersDelta;
    if (Math.abs(expectedGrandTotal - value.grandTotal) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grandTotal"],
        message: `${t("validationGrandTotalExpectedPrefix")} ${expectedGrandTotal}`,
      });
    }
  });

export const receiptValidationSchema = receiptSchema.superRefine((value: Receipt, context) => {
    const positionSchema = editablePositionValidationSchema;

    value.positions.forEach((position, index) => {
      const parsed = positionSchema.safeParse(position);
      if (parsed.success) return;
      parsed.error.issues.forEach((issue) => {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions", index, ...issue.path],
          message: issue.message,
        });
      });
    });

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
        .reduce((acc, claim) => acc + claim.value, 0);

      if (amountClaimsTotal - position.overall > 0.01) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions", index, "claims"],
          message: t("validationClaimedAmountExceeds"),
        });
      }
    });

    value.fees.forEach((fee, index) => {
      const parsed = editableModifierSchema.safeParse(fee);
      if (parsed.success) return;
      parsed.error.issues.forEach((issue) => {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fees", index, ...issue.path],
          message: issue.message,
        });
      });
    });

    value.discounts.forEach((discount, index) => {
      const parsed = editableModifierSchema.safeParse(discount);
      if (parsed.success) return;
      parsed.error.issues.forEach((issue) => {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discounts", index, ...issue.path],
          message: issue.message,
        });
      });
    });

    const calculatedTotal = calculateTotal(value.positions);
    if (Math.abs(calculatedTotal - value.totals.total) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totals", "total"],
        message: `${t("validationTotalMismatchPrefix")} ${value.totals.total} ${t("validationTotalMismatchSuffix")} (${calculatedTotal})`,
      });
    }

    const calculatedGrandTotal = calculateGrandTotal(value);
    if (Math.abs(calculatedGrandTotal - value.totals.grandTotal) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totals", "grandTotal"],
        message: `${t("validationFinalGrandTotalMismatchPrefix")} ${value.totals.grandTotal} ${t("validationFinalGrandTotalMismatchSuffix")} (${calculatedGrandTotal})`,
      });
    }
  });
