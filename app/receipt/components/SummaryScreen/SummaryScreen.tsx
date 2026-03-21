"use client";

import React, { useMemo } from "react";
import { Receipt } from "@/model/receipt/model";
import { calculateBalances } from "@/app/receipt/utils/calculator";
import { t } from "@/app/i18n/translations";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { DistributionStatus } from "@/app/receipt/components/ui/DistributionStatus";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { cn } from "@/utils/cn";
import { formatMoneyValue } from "@/app/receipt/utils/formatMoney";
import { useMoneyFormatter } from "@/app/receipt/components/receipt-context";
import {
  cardPaddingVariants,
  stackGapVariants,
  inlineGapVariants,
  rowVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";

// ── Summary-scoped styles ──────────────────────
const summaryHeader = "border-b border-border/30 bg-muted/20 text-center";
const summaryEmptyState = "py-10";
const summaryBalanceAmountWrapper =
  "text-right shrink-0 flex flex-row items-center gap-1";
const summaryItemRowPadding = "py-0.5";
const summaryItemContainerPadding = "mr-2";
const summaryAmount = "whitespace-nowrap";

interface SummaryScreenProps {
  receipt: Receipt;
  hideHeader?: boolean;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  receipt,
  hideHeader = false,
}) => {
  const { currencySymbol, formatMoney } = useMoneyFormatter();
  const participants = useParticipantsStore((s) => s.participants);
  const balances = useMemo(() => {
    const all = calculateBalances(receipt, participants);
    return all.filter((b) => b.finalAmount > 0.01);
  }, [receipt, participants]);

  // Sum of distributed amounts
  const distributedTotal = useMemo(
    () => balances.reduce((acc, b) => acc + b.finalAmount, 0),
    [balances],
  );

  const realGrandTotal = receipt.totals.grandTotal;
  const remaining = realGrandTotal - distributedTotal;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!hideHeader && (
        <div
          className={cn(
            "relative",
            summaryHeader,
            cardPaddingVariants({ size: "lg" }),
          )}
        >
          <h2
            className={cn(
              "mb-1",
              textVariants({ size: "sm", weight: "medium", tone: "muted", style: "caps" }),
            )}
          >
            {t("total")}
          </h2>
          <div
            className={textVariants({ size: "4xl", weight: "bold" })}
          >
            {formatMoneyValue(realGrandTotal)}{" "}
            <span className={textVariants({ size: "2xl", weight: "normal", tone: "muted" })}>
              {currencySymbol}
            </span>
          </div>

          {Math.abs(remaining) > 1 && (
            <div className="mt-4 flex justify-center">
              <DistributionStatus
                distributed={distributedTotal}
                total={realGrandTotal}
              />
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          stackGapVariants({ size: "md" }),
          cardPaddingVariants({ size: "md" }),
        )}
      >
        {balances.map((balance) => {
          const participant = participants.find(
            (p) => p.id === balance.participantId,
          );
          if (!participant) return null;

          return (
            <ReceiptCard
              key={balance.participantId}
              shadow="sm"
              radius="xl"
              className={cardPaddingVariants({ size: "sm" })}
            >
              <div
                className={cn(
                  rowVariants({ align: "center", width: "full" }),
                  inlineGapVariants({ size: "md" }),
                  "mb-2",
                )}
              >
                <ParticipantAvatar participant={participant} />
                <span
                  className={cn(
                    "flex-1 truncate",
                    textVariants({ size: "lg", weight: "semibold" }),
                  )}
                >
                  {participant.displayName}
                </span>
                <div className={summaryBalanceAmountWrapper}>
                <span
                  className={textVariants({ size: "xs", tone: "muted" })}
                >
                  {Math.abs(balance.finalAmount - balance.baseAmount) > 0.1 && (
                    <>
                      {formatMoneyValue(balance.baseAmount)}{" "}
                      {balance.finalAmount - balance.baseAmount > 0 ? "+" : "−"}{" "}
                      {formatMoneyValue(
                        Math.abs(balance.finalAmount - balance.baseAmount),
                      )}
                      {' = '}
                    </>
                  )}
                </span>
                <span
                  className={textVariants({ size: "xl", weight: "semibold" })}
                >
                  {formatMoney(balance.finalAmount)}
                </span>
                </div>
              </div>

              {balance.items.length > 0 && (
                  <ul
                    className={cn(
                      stackGapVariants({ size: "xs" }),
                      textVariants({ size: "sm", tone: "muted" }),
                    )}
                  >
                    {balance.items.map((item, idx) => (
                      <li
                        key={idx}
                        className={cn(
                          rowVariants({
                            align: "start",
                            justify: "between",
                            width: "full",
                          }),
                          summaryItemRowPadding,
                        )}
                      >
                        <div
                          className={cn(
                            "overflow-hidden flex-1",
                            summaryItemContainerPadding,
                          )}
                        >
                          <div className={textVariants({ size: "base" })}>
                            {item.positionName}
                          </div>
                          {item.description && (
                            <div
                              className={textVariants({ size: "xs", tone: "muted" })}
                            >
                              {item.description}
                            </div>
                          )}
                        </div>
                        <span
                          className={cn(
                            summaryAmount,
                            textVariants({ size: "sm", weight: "medium" }),
                          )}
                        >
                          {formatMoney(item.rawAmount)}
                        </span>
                      </li>
                    ))}
                  </ul>
              )}
            </ReceiptCard>
          );
        })}

        {balances.length === 0 && (
          <div
            className={cn(
              summaryEmptyState,
              textVariants({ tone: "muted" }),
              "text-center",
            )}
          >
            {t("noClaims")}
          </div>
        )}
      </div>
    </div>
  );
};
