import { z } from "zod";

export const positionSchema = z.object({
  name: z.string().describe("The name of the item"),
  price: z.number().describe("The price per unit of the item"),
  quantity: z.number().describe("The quantity of the item"),
  overall: z.number().describe("The total price for this item (quantity * price)")
});

const additionModifierSchema = z.object({
  name: z.string().describe("The name of the modifier (e.g., 'VAT', 'Service Fee', etc)"),
  value: z.number().describe("The value of the modifier (positive)")
});

const discountModifierSchema = z.object({
  name: z.string().describe("The name of the modifier (e.g.'Loyalty Discount' etc)"),
  value: z.number().describe("The value of the modifier (positive)")
});

export const totalSchema = z.object({
  positionsTotal: z.number().describe("The sum of all item totals before modifiers"),
  additions: z.array(additionModifierSchema).describe("Array of modifiers that increase the total amount (e.g., tips, VAT)"),
  discounts: z.array(discountModifierSchema).describe("Array of modifiers that decrease the total amount (e.g., discounts)"),
  total: z.number().describe("The final total amount after all modifiers")
});

export const recieptSchema = z.object({
  positions: z.array(positionSchema).describe("Array of items in the receipt"),
  total: totalSchema.describe("Total information including discounts and tips")
}).describe("Structured data extracted from the receipt");
