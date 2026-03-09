import { roundMoney } from "@/app/receipt/utils/money";

export const formatMoneyValue = (value: number) => {
  const normalized = roundMoney(value);

  if (Number.isInteger(normalized)) {
    return normalized.toFixed(0);
  }

  return normalized.toFixed(2);
};

export const formatMoney = (value: number, currencySymbol = "₽") =>
  `${formatMoneyValue(value)}${currencySymbol ? ` ${currencySymbol}` : ''}`;
