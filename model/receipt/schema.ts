import { z, ZodObject, ZodRawShape } from "zod";

export const positionSchema = z.object({
  name: z.string().describe("The name of the item"),
  price: z.number().describe("The price per unit of the item"),
  quantity: z.number().describe("The quantity of the item"),
  overall: z.number().describe("The total price for this item (quantity * price)")
});

const feeModifierSchema = z.object({
  name: z.string().describe("The name of the modifier (e.g., 'VAT', 'Service Fee', etc)"),
  value: z.number().describe("The value of the modifier (positive)")
});

const discountModifierSchema = z.object({
  name: z.string().describe("The name of the modifier (e.g.'Loyalty Discount' etc)"),
  value: z.number().describe("The value of the modifier (positive)")
});

export const receiptTotalsSchema = z.object({
  total: z.number().describe("The sum of all item totals before all fees and discounts"),
  grandTotal: z.number().describe("The final total amount after all fees and discounts"),
});

export const receiptAiSchema = z.object({
  positions: z.array(positionSchema).describe("Array of items in the receipt"),
  fees: z.array(feeModifierSchema).describe("Array of modifiers that increase the total amount (e.g., tips, VAT)"),
  discounts: z.array(discountModifierSchema).describe("Array of modifiers that decrease the total amount (e.g., discounts)"),
  totals: receiptTotalsSchema.describe("Total information including discounts and tips"),
}).describe("Structured data extracted from the receipt");

const withId = <T extends ZodObject<ZodRawShape>>(initial: T) => z.intersection(
  initial,
  z.object({ id: z.string() }),
);

const claimSchema = z.object({
  id: z.string(),
  participantIds: z.array(z.string()),
  type: z.enum(["quantity", "amount"]),
  value: z.number(),
});

export const receiptSchema = z
  .object({
    positions: z.array(
      z.intersection(
        withId(positionSchema),
        z.object({ claims: z.array(claimSchema) }),
      ),
    ),
    fees: z.array(withId(feeModifierSchema)),
    discounts: z.array(withId(discountModifierSchema)),
    totals: receiptTotalsSchema.describe(
      "Total information including discounts and tips",
    ),
    editingFinished: z.boolean().optional(),
  })
  .describe("Structured data extracted from the receipt");

export const participantDtoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  color: z.string(),
  kind: z.enum(["REAL", "MOCK"]),
  avatarUrl: z.string().optional(),
});

export const receiptWithParticipantsSchema = z.object({
  receipt: receiptSchema,
  participants: z.array(participantDtoSchema),
});
