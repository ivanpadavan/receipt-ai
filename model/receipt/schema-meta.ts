import { z } from "zod";

export const receiptCurrencySymbolValues = [
  "$", // US Dollar and other dollar currencies
  "€", // Euro
  "£", // Pound Sterling and other pound currencies
  "¥", // Japanese Yen / Chinese Yuan
  "₽", // Russian Ruble
  "₩", // South Korean Won
  "₹", // Indian Rupee
  "₺", // Turkish Lira
  "₴", // Ukrainian Hryvnia
  "₦", // Nigerian Naira
  "₱", // Philippine Peso
  "₫", // Vietnamese Dong
  "₡", // Costa Rican Colon
  "₲", // Paraguayan Guarani
  "₸", // Kazakhstani Tenge
  "₭", // Lao Kip
  "₮", // Mongolian Tugrik
  "₾", // Georgian Lari
  "₪", // Israeli New Shekel
  "₼", // Azerbaijani Manat
  "฿", // Thai Baht
] as const;

export const receiptMetaBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .describe(
      "Short receipt name in the receipt language. Prefer venue name if identifiable; otherwise create a light, casual title based on receipt items/context, still in the receipt language.",
    ),
  currencySymbol: z
    .enum(receiptCurrencySymbolValues)
    .describe(
      "Single-character currency symbol used on the receipt (for example $, €, £, ₽).",
    ),
});
