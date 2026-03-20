import { t } from "@/app/i18n/translations";
import { z, ZodObject, ZodRawShape, type ZodTypeAny } from "zod";
import { metaBaseSchema } from "@/model/receipt/schema-meta";

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

export const metaAiSchema = metaBaseSchema.extend({
  title: metaBaseSchema.shape.title.optional(),
  currencySymbol: metaBaseSchema.shape.currencySymbol.optional(),
});

export const positionAiSchema = z.object({
  name: z.string().superRefine((value, context) => {
    if (value.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationNameRequired"),
      });
    }
  }).describe("The name of the item"),
  price: z.number().superRefine((value, context) => {
    if (!isPositiveFinite(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationPricePositive"),
      });
    }
  }).describe("The price per unit of the item"),
  quantity: z.number().superRefine((value, context) => {
    if (!isPositiveFinite(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationQuantityPositive"),
      });
    }
  }).describe("The quantity of the item"),
  overall: z.number().superRefine((value, context) => {
    if (!isPositiveFinite(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationOverallPositive"),
      });
    }
  }).describe("The total price for this item (quantity * price)"),
});

export const modifierSchema = z.object({
  name: z.string().superRefine((value, context) => {
    if (value.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationNameRequired"),
      });
    }
  }).describe("The name of the modifier (e.g., 'VAT', 'Service Fee', etc)"),
  value: z.number().superRefine((value, context) => {
    if (!isPositiveFinite(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationModifierValuePositive"),
      });
    }
  }).describe("The value of the modifier (positive)"),
});

export const receiptTotalsSchema = z.object({
  total: z.number().superRefine((value, context) => {
    if (!isPositiveFinite(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationTotalPositive"),
      });
    }
  }).describe("The sum of all item totals before all fees and discounts"),
  grandTotal: z.number().superRefine((value, context) => {
    if (!isPositiveFinite(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validationGrandTotalPositive"),
      });
    }
  }).describe("The final total amount after all fees and discounts"),
});

export const createReceiptBaseSchema = <
  TPositionSchema extends ZodTypeAny,
  TModifierSchema extends ZodTypeAny = typeof modifierSchema,
>(
  positionItemSchema: TPositionSchema,
  modifierItemSchema?: TModifierSchema,
) =>
  z.object({
    meta: metaAiSchema.describe(
      "Receipt metadata. Try to infer currencySymbol from the receipt when possible.",
    ),
    positions: z.array(positionItemSchema).describe("Array of items in the receipt"),
    fees: z.array(modifierItemSchema ?? modifierSchema).describe("Array of modifiers that increase the total amount (e.g., tips, VAT)"),
    discounts: z.array(modifierItemSchema ?? modifierSchema).describe("Array of modifiers that decrease the total amount (e.g., discounts)"),
    totals: receiptTotalsSchema.describe("Total information including discounts and tips"),
  });

export const receiptAiSchema = createReceiptBaseSchema(positionAiSchema).describe(
  "Structured data extracted from the receipt",
);

export const withId = <T extends ZodObject<ZodRawShape>>(initial: T) =>
  z.intersection(initial, z.object({ id: z.string() }));

export const positionWithIdSchema = withId(positionAiSchema);
export const modifierWithIdSchema = withId(modifierSchema);
export const structuralPreviewPositionSchema = positionAiSchema.extend({
  id: z.string().optional(),
});
export const structuralPreviewModifierSchema = modifierSchema.extend({
  id: z.string().optional(),
});

export const receiptStructuralPreviewSchema = createReceiptBaseSchema(
  structuralPreviewPositionSchema,
  structuralPreviewModifierSchema,
).describe(
  "Structural receipt preview returned by AI chat",
);

export const receiptWithIdsSchema = createReceiptBaseSchema(
  positionWithIdSchema,
  modifierWithIdSchema,
).describe(
  "Receipt structure with ids",
);
