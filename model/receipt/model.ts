import { z } from "zod";
import { participantDtoSchema, receiptAiSchema, receiptSchema, receiptWithParticipantsSchema } from "./schema";

// Infer TypeScript types from Zod schema
export type ReceiptModifier = z.infer<typeof receiptSchema>["fees"][number] | z.infer<typeof receiptSchema>["discounts"][number];
export type ReceiptPosition = z.infer<typeof receiptSchema>["positions"][number];
export type ReceiptPositionClaim = z.infer<typeof receiptSchema>["positions"][number]["claims"][number];
export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptWithParticipants = z.infer<typeof receiptWithParticipantsSchema>;

export type ParticipantDTO = z.infer<typeof participantDtoSchema>;

// Infer TypeScript types from Zod schema
export type ReceiptModifierNoId = z.infer<typeof receiptAiSchema>["fees"][number] | z.infer<typeof receiptSchema>["discounts"][number];
export type ReceiptPositionNoId = z.infer<typeof receiptAiSchema>["positions"][number];
export type ReceiptNoId = z.infer<typeof receiptAiSchema>;


export function validatePosition(position: ReceiptPositionNoId): string {
  const calculatedOverall = position.quantity * position.price;
  return Math.abs(calculatedOverall - position.overall) > 0.01
    ? `Position ${position.name}: overall value ${position.overall} doesn't match quantity * price (${position.quantity} * ${position.price} = ${calculatedOverall})` : '';
}

/**
 * Calculates the sum of all position overall values
 * @param positions Array of receipt positions
 * @returns The sum of all position overall values
 */
export function calculateTotal(positions: ReceiptPositionNoId[]): number {
  return positions.reduce((sum, position) => sum + position.overall, 0);
}

export function calculateGrandTotal({ totals: { total }, discounts, fees }: ReceiptNoId) {
  return total + sumModifiers(fees) - sumModifiers(discounts);
}


/**
 * Calculates the sum of all modifier values
 * @param modifiers Array of receipt modifiers
 * @returns The sum of all modifier values
 */
export function sumModifiers(modifiers: ReceiptModifierNoId[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
}