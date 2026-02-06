import { z } from "zod";
import { participantDtoSchema, receiptAiSchema, receiptSchema, receiptWithParticipantsSchema } from "./schema";

// Infer TypeScript types from Zod schema
export type ReceiptModifier = z.infer<typeof receiptSchema>["fees"][number] | z.infer<typeof receiptSchema>["discounts"][number];
export type ReceiptPosition = z.infer<typeof receiptSchema>["positions"][number];
export type ReceiptPositionClaim = z.infer<typeof receiptSchema>["positions"][number]["claims"][number];
export type Receipt = z.infer<typeof receiptSchema>;
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

/**
 * Validates all positions in a receipt
 * @param positions Array of receipt positions
 * @returns Array of error messages
 */
export function validateAllPositions(positions: ReceiptPositionNoId[]): string[] {
  const errors: string[] = [];

  positions.forEach((position, index) => {
    const error = validatePosition(position);
    if (!error) return;
    errors.push(`${error} at index ${index}`);
  });

  return errors;
}

/**
 * Validates that the total equals the sum of all position overall values
 * @param positions Array of receipt positions
 * @param total The total value to validate
 * @returns Error message or empty string if valid
 */
export function validateTotal({ positions, totals: { total } }: ReceiptNoId): string {
  const calculatedTotal = calculateTotal(positions);

  if (Math.abs(calculatedTotal - total) > 0.01) {
    return `Total ${total} doesn't match the sum of all position overall values (${calculatedTotal})`;
  }

  return '';
}

export function validateFinalTotal(receipt: ReceiptNoId): string {
  const { totals: { total, grandTotal }, fees, discounts } = receipt;
  const calculatedGrandTotal = calculateGrandTotal(receipt);
  if (Math.abs(calculatedGrandTotal - grandTotal) > 0.01) {
    return `Final grand total ${grandTotal} doesn't match total + fees - discounts (${total} + ${sumModifiers(fees)} - ${sumModifiers(discounts)} = ${calculatedGrandTotal})`;
  }

  return '';
}

/**
 * Validates that a receipt's calculations are correct:
 * 1. Each position's overall value equals quantity * price
 * 2. The total equals the sum of all position overall values
 * 3. The final grand total equals total + sum of fees - sum of discounts
 * 4. The final grand total equals the direct sum of all position overall values + sum of fees - sum of discounts
 *
 * @param receipt The receipt data to validate
 * @returns An object with isValid flag and any error messages
 */
export function validateReceipt(receipt: ReceiptNoId): {
  isValid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  // Validate each position's calculation
  errors.push(...validateAllPositions(receipt.positions));

  // Validate total
  const totalError = validateTotal(receipt);
  if (totalError) {
    errors.push(totalError);
  }

  // Validate final grand total
  const finalTotalError = validateFinalTotal(receipt);
  if (finalTotalError) {
    errors.push(finalTotalError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
