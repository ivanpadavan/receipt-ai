import { t } from "@/app/i18n/translations";
import { addMoney } from "@/app/receipt/utils/money";
import { type Receipt } from "@/model/receipt/model";
import {
  receiptTotalsSchema,
  withId,
  modifierSchema,
  positionAiSchema,
  receiptAiSchema,
} from "@/model/receipt/schema-structural";
import { receiptMetaBaseSchema } from "@/model/receipt/schema-meta";
import {
  addPositionBusinessIssues,
  addReceiptBusinessIssues,
  addReceiptTotalsBusinessIssues,
} from "@/model/receipt/validation-helpers";
import { z } from "zod";

const claimSchema = z.object({
  id: z.string(),
  participantIds: z.array(z.string()),
  type: z.enum(["quantity", "amount"]),
  value: z.number(),
});

export const receiptMetaSchema = receiptMetaBaseSchema;

export const receiptWithIdsSchema = receiptAiSchema
  .extend({
    receiptMeta: receiptMetaSchema,
    positions: z.array(
      z.intersection(
        withId(positionAiSchema),
        z.object({ claims: z.array(claimSchema) }),
      ),
    ),
    fees: z.array(withId(modifierSchema)),
    discounts: z.array(withId(modifierSchema)),
  });

export const receiptSchema = receiptWithIdsSchema
  .superRefine((value, context) => {
    addReceiptBusinessIssues(
      {
        positions: value.positions.map(
          ({ claims: _claims, ...position }) => position,
        ),
        fees: value.fees,
        discounts: value.discounts,
        totals: value.totals,
      },
      context,
    );
  })
  .describe("Structured data extracted from the receipt");

export const editablePositionValidationSchema = z.any().superRefine(
  (value, context) => {
    const baseValidation = positionAiSchema.safeParse(value);
    if (!baseValidation.success) {
      baseValidation.error.issues.forEach((issue) => {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: issue.path,
          message: issue.message,
        });
      });
      return;
    }

    addPositionBusinessIssues(value, {
      addIssue: (issue) => context.addIssue(issue),
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
      message: issue.message,
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
          message: issue.message,
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
            path: issue.path?.slice(-1) ?? issue.path,
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
