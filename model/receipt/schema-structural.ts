import { z, ZodObject, ZodRawShape, type ZodTypeAny } from "zod";

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

export const positionAiSchema = z.object({
  name: z.string().trim().min(1).describe("The name of the item"),
  price: z.number().refine(isPositiveFinite).describe("The price per unit of the item"),
  quantity: z.number().refine(isPositiveFinite).describe("The quantity of the item"),
  overall: z.number().refine(isPositiveFinite).describe("The total price for this item (quantity * price)"),
});

export const modifierSchema = z.object({
  name: z.string().trim().min(1).describe("The name of the modifier (e.g., 'VAT', 'Service Fee', etc)"),
  value: z.number().refine(isPositiveFinite).describe("The value of the modifier (positive)"),
});

export const receiptTotalsSchema = z.object({
  total: z.number().refine(isPositiveFinite).describe("The sum of all item totals before all fees and discounts"),
  grandTotal: z.number().refine(isPositiveFinite).describe("The final total amount after all fees and discounts"),
});

const createReceiptBaseSchema = <TPositionSchema extends ZodTypeAny>(
  positionItemSchema: TPositionSchema,
) =>
  z.object({
    positions: z.array(positionItemSchema).describe("Array of items in the receipt"),
    fees: z.array(modifierSchema).describe("Array of modifiers that increase the total amount (e.g., tips, VAT)"),
    discounts: z.array(modifierSchema).describe("Array of modifiers that decrease the total amount (e.g., discounts)"),
    totals: receiptTotalsSchema.describe("Total information including discounts and tips"),
  });

export const receiptAiSchema = createReceiptBaseSchema(positionAiSchema).describe(
  "Structured data extracted from the receipt",
);

export const withId = <T extends ZodObject<ZodRawShape>>(initial: T) =>
  z.intersection(initial, z.object({ id: z.string() }));
