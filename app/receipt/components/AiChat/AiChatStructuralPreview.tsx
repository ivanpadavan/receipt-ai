"use client";

import React from "react";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { useMoneyFormatter } from "@/app/receipt/components/receipt-context";
import { cn } from "@/utils/cn";
import {
  textVariants,
  rowVariants,
  stackGapVariants,
} from "@/app/receipt/components/ui-styles";
import { t } from "@/app/i18n/translations";
import type { ReceiptChatResponse } from "@/model/receipt/schema-chat";

type StructuralReceipt = Extract<
  ReceiptChatResponse,
  { type: "structural_preview" }
>["receipt"];

interface AiChatStructuralPreviewProps {
  receipt: StructuralReceipt;
}

export const AiChatStructuralPreview: React.FC<AiChatStructuralPreviewProps> = ({
  receipt,
}) => {
  const { currencySymbol, formatMoney } = useMoneyFormatter();
  const receiptCurrency = receipt.meta.currencySymbol ?? currencySymbol;
  const title = receipt.meta.title ?? t("receipt");

  return (
    <ReceiptCard shadow="sm" radius="xl" tone="soft" className="overflow-hidden">
      <div className="p-4">
        <div className={cn("mb-4", stackGapVariants({ size: "xs" }))}>
          <div className={textVariants({ size: "sm", tone: "muted", style: "caps" })}>
            {t("aiChatStructuralPreview")}
          </div>
          <div className={textVariants({ size: "lg", weight: "semibold" })}>
            {title}
          </div>
        </div>

        <div className={stackGapVariants({ size: "sm" })}>
          {receipt.positions.length > 0 && (
            <div className={stackGapVariants({ size: "xs" })}>
              <div className={textVariants({ size: "sm", weight: "medium", tone: "muted" })}>
                {t("positions")}
              </div>
              {receipt.positions.map((position, index) => (
                <div
                  key={`${position.name}-${index}`}
                  className={cn(
                    rowVariants({ align: "center", justify: "between", width: "full" }),
                    "rounded-xl bg-background/70 px-3 py-2",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className={textVariants({ size: "sm", weight: "semibold" })}>
                      {position.name}
                    </div>
                    <div className={textVariants({ size: "xs", tone: "muted" })}>
                      {position.quantity} x {formatMoney(position.price, receiptCurrency)}
                    </div>
                  </div>
                  <div className={textVariants({ size: "sm", weight: "semibold" })}>
                    {formatMoney(position.overall, receiptCurrency)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {receipt.fees.length > 0 && (
            <div className={stackGapVariants({ size: "xs" })}>
              <div className={textVariants({ size: "sm", weight: "medium", tone: "muted" })}>
                {t("fees")}
              </div>
              {receipt.fees.map((fee, index) => (
                <div
                  key={`${fee.name}-${index}`}
                  className={cn(
                    rowVariants({ align: "center", justify: "between", width: "full" }),
                    "rounded-xl bg-background/70 px-3 py-2",
                  )}
                >
                  <div className={textVariants({ size: "sm", weight: "semibold" })}>
                    {fee.name}
                  </div>
                  <div className={textVariants({ size: "sm", weight: "semibold" })}>
                    {formatMoney(fee.value, receiptCurrency)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {receipt.discounts.length > 0 && (
            <div className={stackGapVariants({ size: "xs" })}>
              <div className={textVariants({ size: "sm", weight: "medium", tone: "muted" })}>
                {t("discounts")}
              </div>
              {receipt.discounts.map((discount, index) => (
                <div
                  key={`${discount.name}-${index}`}
                  className={cn(
                    rowVariants({ align: "center", justify: "between", width: "full" }),
                    "rounded-xl bg-background/70 px-3 py-2",
                  )}
                >
                  <div className={textVariants({ size: "sm", weight: "semibold" })}>
                    {discount.name}
                  </div>
                  <div className={textVariants({ size: "sm", weight: "semibold" })}>
                    {formatMoney(discount.value, receiptCurrency)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={cn("rounded-xl bg-white/80 px-3 py-2", rowVariants({ align: "center", justify: "between", width: "full" }))}>
            <div className={textVariants({ size: "sm", tone: "muted" })}>
              {t("total")}
            </div>
            <div className={textVariants({ size: "sm", weight: "semibold" })}>
              {formatMoney(receipt.totals.total, receiptCurrency)}
            </div>
          </div>
          <div className={cn("rounded-xl bg-white/90 px-3 py-2", rowVariants({ align: "center", justify: "between", width: "full" }))}>
            <div className={textVariants({ size: "sm", tone: "muted" })}>
              {t("grandTotal")}
            </div>
            <div className={textVariants({ size: "sm", weight: "semibold" })}>
              {formatMoney(receipt.totals.grandTotal, receiptCurrency)}
            </div>
          </div>
        </div>
      </div>
    </ReceiptCard>
  );
};
