import { roundMoney } from "@/app/receipt/utils/money";

export const formatMoneyValue = (value: number) => {
  const normalized = roundMoney(value);

  if (Number.isInteger(normalized)) {
    return normalized.toFixed(0);
  }

  return normalized
    .toFixed(2)
    .replace(/\.0+$/, "")
    .replace(/(\.[1-9]*)0+$/, "$1");
};

export const formatMoney = (value: number) => `${formatMoneyValue(value)} ₽`;
