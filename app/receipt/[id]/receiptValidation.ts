import { z } from "zod";
import {
  Receipt,
  calculateGrandTotal,
  calculateTotal,
} from "@/model/receipt/model";
import { receiptSchema } from "@/model/receipt/schema";

const editablePositionBaseSchema = z.object({
  name: z.string().trim().min(1, "Name should not be empty"),
  price: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      "Price should be greater than 0",
    ),
  quantity: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      "Quantity should be greater than 0",
    ),
  overall: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      "Overall should be greater than 0",
    ),
});

export const editablePositionValidationSchema =
  editablePositionBaseSchema.superRefine((value, context) => {
    const calculatedOverall = value.price * value.quantity;
    if (Math.abs(calculatedOverall - value.overall) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overall"],
        message: "Overall should match quantity x price",
      });
    }
  });

export const editableModifierSchema = z.object({
  name: z.string().trim().min(1, "Name should not be empty"),
  value: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      "Value should be greater than 0",
    ),
});

export const editableTotalsSchema = z.object({
  total: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      "Total should be greater than 0",
    ),
  grandTotal: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value > 0,
      "Grand total should be greater than 0",
    ),
});

export const createEditableTotalsSchema = (receipt: Receipt) =>
  editableTotalsSchema.superRefine((value, context) => {
    const calculatedTotal = calculateTotal(receipt.positions);
    if (Math.abs(calculatedTotal - value.total) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total"],
        message: `Total ${value.total} doesn't match positions sum (${calculatedTotal})`,
      });
    }

    const calculatedGrandTotal =
      calculatedTotal - receipt.discounts.reduce((acc, discount) => acc + discount.value, 0) +
      receipt.fees.reduce((acc, fee) => acc + fee.value, 0);
    if (Math.abs(calculatedGrandTotal - value.grandTotal) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grandTotal"],
        message:
          `Grand total ${value.grandTotal} doesn't match modifiers result (${calculatedGrandTotal})`,
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
          message: "Claimed quantity is greater than position quantity",
        });
      }

      const amountClaimsTotal = nonEmptyClaims
        .filter((claim) => claim.type === "amount")
        .reduce((acc, claim) => acc + claim.value, 0);

      if (amountClaimsTotal - position.overall > 0.01) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions", index, "claims"],
          message: "Claimed amount is greater than position total",
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
        message: `Total ${value.totals.total} doesn't match the sum of all position overall values (${calculatedTotal})`,
      });
    }

    const calculatedGrandTotal = calculateGrandTotal(value);
    if (Math.abs(calculatedGrandTotal - value.totals.grandTotal) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totals", "grandTotal"],
        message: `Final grand total ${value.totals.grandTotal} doesn't match calculated (${calculatedGrandTotal})`,
      });
    }
  });
