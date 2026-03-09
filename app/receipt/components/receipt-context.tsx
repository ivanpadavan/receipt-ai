"use client";

import { createContext, useContext } from "react";
import type { ReceiptState } from "@/app/receipt/[id]/useReceiptFormState";
import { formatMoney as formatMoneyWithSymbol } from "@/app/receipt/utils/formatMoney";

const DEFAULT_CURRENCY_SYMBOL = "₽";

export const ReceiptFormContext = createContext<ReceiptState | null>(null);

export const useReceiptState = (): ReceiptState => {
  const ctx = useContext(ReceiptFormContext);
  if (ctx === null) {
    throw new Error("should be provided");
  }
  return ctx;
};

export const useMoneyFormatter = () => {
  const ctx = useContext(ReceiptFormContext);
  const currencySymbol =
    ctx?.scenario.form.getValues("meta.currencySymbol") ||
    DEFAULT_CURRENCY_SYMBOL;

  return {
    currencySymbol,
    formatMoney: (value: number, currencySymbolOverride?: string) =>
      formatMoneyWithSymbol(value, currencySymbolOverride ?? currencySymbol),
  };
};

