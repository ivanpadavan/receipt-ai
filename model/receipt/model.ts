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
export function calculatePositionsTotal(positions: ReceiptPosition[]): number {
  return positions.reduce((sum, position) => sum + position.overall, 0);
}

export function calculateTotal({ total: { positionsTotal, discounts, fees } }: Receipt) {
  return positionsTotal + sumModifiers(fees) - sumModifiers(discounts);
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
 * Validates that the positionsTotal equals the sum of all position overall values
 * @param positions Array of receipt positions
 * @param positionsTotal The total value to validate
 * @returns Error message or empty string if valid
 */
export function validatePositionsTotal({ positions, total: { positionsTotal } }: Receipt): string {
  const calculatedPositionsTotal = calculatePositionsTotal(positions);

  if (Math.abs(calculatedPositionsTotal - positionsTotal) > 0.01) {
    return `Positions total ${positionsTotal} doesn't match the sum of all position overall values (${calculatedPositionsTotal})`;
  }

  return '';
}

/**
 * Validates that the final total equals positionsTotal + fees - discounts
 * @param positionsTotal The positions total value
 * @param fees Array of receipt fees
 * @param discounts Array of receipt discounts
 * @param total The final total value to validate
 * @returns Error message or empty string if valid
 */
export function validateFinalTotal(receipt: Receipt): string {
  const { positionsTotal, fees, discounts, total } = receipt.total;
  const calculatedTotal = calculateTotal(receipt);
  if (Math.abs(calculatedTotal - total) > 0.01) {
    return `Final total ${total} doesn't match positionsTotal + fees - discounts (${positionsTotal} + ${sumModifiers(fees)} - ${sumModifiers(discounts)} = ${calculatedTotal})`;
  }

  return '';
}

/**
 * Validates that a receipt's calculations are correct:
 * 1. Each position's overall value equals quantity * price
 * 2. The positionsTotal equals the sum of all position overall values
 * 3. The final total equals positionsTotal + sum of fees - sum of discounts
 * 4. The final total equals the direct sum of all position overall values + sum of fees - sum of discounts
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

  // Validate positions total
  const positionsTotalError = validatePositionsTotal(receipt);
  if (positionsTotalError) {
    errors.push(positionsTotalError);
  }

  // Validate final total
  const finalTotalError = validateFinalTotal(receipt);
  if (finalTotalError) {
    errors.push(finalTotalError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
