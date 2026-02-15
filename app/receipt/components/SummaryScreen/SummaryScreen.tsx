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
const summaryBalanceAmountWrapper = "text-right shrink-0";
const summaryItemList = "border-l-2 border-border/50";
const summaryItemIndent = "ml-5";
const summaryItemRowPadding = "py-0.5";
const summaryItemContainerPadding = "mr-2";
const summaryAmount = "whitespace-nowrap";

interface SummaryScreenProps {
  receipt: Receipt;
  receiptId: string;
  onBack: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ receipt }) => {
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
      {/* Header / Hero */}
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
          {realGrandTotal.toFixed(0)}{" "}
          <span className={textVariants({ size: "2xl", weight: "normal", tone: "muted" })}>
            ₽
          </span>
        </div>

        {/* Remaining Indicator */}
        {Math.abs(remaining) > 1 && (
          <div className="mt-4 flex justify-center">
            <DistributionStatus
              distributed={distributedTotal}
              total={realGrandTotal}
              precision={0}
            />
          </div>
        )}
      </div>

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
                    className={textVariants({ size: "xl", weight: "semibold" })}
                  >
                    {balance.finalAmount.toFixed(0)} ₽
                  </span>
                  {Math.abs(balance.finalAmount - balance.baseAmount) > 0.1 && (
                    <span className={textVariants({ size: "xs", tone: "muted" })}>
                      {balance.baseAmount.toFixed(0)}{" "}
                      {balance.finalAmount - balance.baseAmount > 0 ? "+" : "−"}{" "}
                      {Math.abs(
                        balance.finalAmount - balance.baseAmount,
                      ).toFixed(0)}
                    </span>
                  )}
                </div>
              </div>

              {balance.items.length > 0 && (
                <div className={cn("w-full", summaryItemIndent)}>
                  <ul
                    className={cn(
                      stackGapVariants({ size: "xs" }),
                      summaryItemList,
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
                          {item.rawAmount.toFixed(0)} ₽
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
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
