import { addMoney, multiplyMoney, roundMoney } from "@/app/receipt/utils/money";

export function validatePosition(position: {
  name: string;
  price: number;
  quantity: number;
  overall: number;
}): string {
  const calculatedOverall = multiplyMoney(position.price, position.quantity);
  return Math.abs(calculatedOverall - position.overall) > 0.01
    ? `Position ${position.name}: overall value ${position.overall} doesn't match quantity * price (${position.quantity} * ${position.price} = ${calculatedOverall})`
    : "";
}

export function calculateTotal<T extends { overall: number }>(
  positions: T[],
): number {
  return positions.reduce((sum, position) => addMoney(sum, position.overall), 0);
}

export function sumModifiers<T extends { value: number }>(modifiers: T[]): number {
  return modifiers.reduce((sum, modifier) => addMoney(sum, modifier.value), 0);
}

export function calculateGrandTotal<
  T extends {
    totals: { total: number };
    discounts: { value: number }[];
    fees: { value: number }[];
  },
>({ totals: { total }, discounts, fees }: T) {
  return roundMoney(total + sumModifiers(fees) - sumModifiers(discounts));
}

export function getExpectedReceiptTotals<
  T extends {
    positions: { overall: number }[];
    discounts: { value: number }[];
    fees: { value: number }[];
  },
>(
  { positions, discounts, fees }: T,
  totalOverride?: number,
) {
  const total = totalOverride ?? calculateTotal(positions);
  const grandTotal = calculateGrandTotal({
    totals: { total },
    discounts,
    fees,
  });

  return { total, grandTotal };
}
