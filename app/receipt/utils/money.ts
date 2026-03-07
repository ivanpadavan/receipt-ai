const CENTS_MULTIPLIER = 100;

export const toCents = (value: number) =>
  Math.round((value + Number.EPSILON) * CENTS_MULTIPLIER);

export const fromCents = (value: number) => value / CENTS_MULTIPLIER;

export const roundMoney = (value: number) => fromCents(toCents(value));

export const multiplyMoney = (amount: number, multiplier: number) =>
  fromCents(Math.round(toCents(amount) * multiplier));

export const addMoney = (...values: number[]) =>
  fromCents(values.reduce((sum, value) => sum + toCents(value), 0));
