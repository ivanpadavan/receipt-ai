import { z } from "zod";
import { recieptSchema } from "./schema";

// Infer TypeScript types from Zod schema
export type ReceiptModifier = z.infer<typeof recieptSchema>["total"]["fees"][number] | z.infer<typeof recieptSchema>["total"]["discounts"][number];
export type ReceiptPosition = z.infer<typeof recieptSchema>["positions"][number];
export type Receipt = z.infer<typeof recieptSchema>;


export function validatePosition(position: ReceiptPosition): string {
  const calculatedOverall = position.quantity * position.price;
  return Math.abs(calculatedOverall - position.overall) > 0.01
    ? `Position ${position.name}: overall value ${position.overall} doesn't match quantity * price (${position.quantity} * ${position.price} = ${calculatedOverall})` : '';
}

/**
 * Calculates the sum of all position overall values
 * @param positions Array of receipt positions
 * @returns The sum of all position overall values
 */
export function calculateTotal(positions: ReceiptPosition[]): number {
  return positions.reduce((sum, position) => sum + position.overall, 0);
}

export function calculateGrandTotal({ total: { totals: { total }, discounts, fees } }: Receipt) {
  return total + sumModifiers(fees) - sumModifiers(discounts);
};


/**
 * Calculates the sum of all modifier values
 * @param modifier Array of receipt modifiers
 * @returns The sum of all modifier values
 */
export function sumModifiers(modifiers: ReceiptModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
}

/**
 * Validates all positions in a receipt
 * @param positions Array of receipt positions
 * @returns Array of error messages
 */
export function validateAllPositions(positions: ReceiptPosition[]): string[] {
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
export function validateTotal({ positions, total: { totals: { total } } }: Receipt): string {
  const calculatedTotal = calculateTotal(positions);

  if (Math.abs(calculatedTotal - total) > 0.01) {
    return `Total ${total} doesn't match the sum of all position overall values (${calculatedTotal})`;
  }

  return '';
}

/**
 * Validates that the final grand total equals total + fees - discounts
 * @param total The total value
 * @param fees Array of receipt fees
 * @param discounts Array of receipt discounts
 * @param grandTotal The final grand total value to validate
 * @returns Error message or empty string if valid
 */
export function validateFinalTotal(receipt: Receipt): string {
  const { totals: { total, grandTotal }, fees, discounts } = receipt.total;
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
export function validateReceipt(receipt: Receipt): {
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
