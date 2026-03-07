import { multiplyMoney } from "@/app/receipt/utils/money";
import { getExpectedReceiptTotals } from "@/model/receipt/model";
import { z, ZodObject, ZodRawShape, type ZodTypeAny } from "zod";

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

export const positionAiSchema = z.object({
  name: z.string().trim().min(1).describe("The name of the item"),
  price: z.number().refine(isPositiveFinite).describe("The price per unit of the item"),
  quantity: z.number().refine(isPositiveFinite).describe("The quantity of the item"),
  overall: z.number().refine(isPositiveFinite).describe("The total price for this item (quantity * price)"),
});

const addPositionBusinessIssues = (
  value: z.infer<typeof positionAiSchema>,
  context: z.RefinementCtx,
  pathPrefix: Array<string | number> = [],
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

export const positionSchema = positionAiSchema.superRefine((value, context) => {
  addPositionBusinessIssues(value, context);
});

const feeModifierSchema = z.object({
  name: z.string().trim().min(1).describe("The name of the modifier (e.g., 'VAT', 'Service Fee', etc)"),
  value: z.number().refine(isPositiveFinite).describe("The value of the modifier (positive)")
});

const discountModifierSchema = z.object({
  name: z.string().trim().min(1).describe("The name of the modifier (e.g.'Loyalty Discount' etc)"),
  value: z.number().refine(isPositiveFinite).describe("The value of the modifier (positive)")
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
    fees: z.array(feeModifierSchema).describe("Array of modifiers that increase the total amount (e.g., tips, VAT)"),
    discounts: z.array(discountModifierSchema).describe("Array of modifiers that decrease the total amount (e.g., discounts)"),
    totals: receiptTotalsSchema.describe("Total information including discounts and tips"),
  });

export const receiptAiSchema = createReceiptBaseSchema(positionAiSchema).describe(
  "Structured data extracted from the receipt",
);

const addReceiptBusinessIssues = (
  value: z.infer<typeof receiptAiSchema>,
  context: z.RefinementCtx,
) => {
  value.positions.forEach((position, index) => {
    addPositionBusinessIssues(position, context, ["positions", index]);
  });

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

export const receiptBusinessSchema = receiptAiSchema
  .superRefine((value, context) => {
    addReceiptBusinessIssues(value, context);
  })
  .describe("Structured data extracted from the receipt");

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

export const receiptSchema = receiptAiSchema
  .extend({
    positions: z.array(
      z.intersection(
        withId(positionAiSchema),
        z.object({ claims: z.array(claimSchema) }),
      ),
    ),
    fees: z.array(withId(feeModifierSchema)),
    discounts: z.array(withId(discountModifierSchema)),
  })
  .superRefine((value, context) => {
    addReceiptBusinessIssues({
      positions: value.positions.map(({ claims: _claims, ...position }) => position),
      fees: value.fees,
      discounts: value.discounts,
      totals: value.totals,
    }, context);
  })
  .describe("Structured data extracted from the receipt");

export const participantDtoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  color: z.string(),
  kind: z.enum(["REAL", "MOCK"]),
  avatarUrl: z.string().optional(),
  isOnline: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
});

export const receiptWithParticipantsSchema = z.object({
  receipt: receiptSchema,
  participants: z.array(participantDtoSchema),
});
