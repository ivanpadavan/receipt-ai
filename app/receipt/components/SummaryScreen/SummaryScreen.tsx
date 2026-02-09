"use client";

import React, { useMemo } from "react";
import { Receipt } from "@/model/receipt/model";
import { calculateBalances } from "@/app/receipt/utils/calculator";
import { t } from "@/app/i18n/translations";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { DistributionStatus } from "@/app/receipt/components/ui/DistributionStatus";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const summaryHeaderVariants = cva("border-b bg-card text-center");
const summaryLabelVariants = cva("text-lg font-medium text-muted-foreground");
const summaryTotalVariants = cva("text-4xl font-bold text-foreground");
const summaryCurrencyVariants = cva("text-2xl text-muted-foreground");
const balanceNameVariants = cva("font-medium text-lg text-left truncate");
const balanceAmountVariants = cva("font-bold text-xl block");
const balanceDiffVariants = cva("text-xs text-muted-foreground");
const itemListVariants = cva("text-sm text-muted-foreground border-t pt-2 border-border/40");
const itemNameVariants = cva("truncate text-foreground");
const itemDescVariants = cva("text-xs text-muted-foreground truncate");
const emptyStateVariants = cva("text-center text-muted-foreground py-8");
const balanceAmountWrapperVariants = cva("text-right");
const summaryHeaderPaddingVariants = cva("p-6");
const summaryListPaddingVariants = cva("p-4");
const summaryCardPaddingVariants = cva("p-3");
const summaryItemIndentVariants = cva("pl-12");
const summaryItemContainerPaddingVariants = cva("pr-2");
const summaryItemRowPaddingVariants = cva("py-1");
const summaryAmountVariants = cva("whitespace-nowrap font-medium");

interface SummaryScreenProps {
  receipt: Receipt;
  receiptId: string;
  onBack: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  receipt,
  receiptId,
  onBack,
}) => {
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

  // Real receipt grand total (from API/model)
  // We need to trust receipt.totals.grandTotal
  // Note: calculateBalances applies a ratio based on receipt.totals.grandTotal / sum(positions).
  // So if all positions are claimed, distributedTotal ~= receipt.totals.grandTotal.
  // If not, there is a diff.
  const realGrandTotal = receipt.totals.grandTotal;
  const remaining = realGrandTotal - distributedTotal;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header / Hero */}
      <div
        className={cn(
          "relative",
          summaryHeaderVariants(),
          summaryHeaderPaddingVariants(),
        )}
      >
        <h2 className={cn("mb-1", summaryLabelVariants())}>
          {t("total")}
        </h2>
        <div className={summaryTotalVariants()}>
          {realGrandTotal.toFixed(0)}{" "}
          <span className={summaryCurrencyVariants()}>₽</span>
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
          "flex-1 overflow-y-auto space-y-3",
          summaryListPaddingVariants(),
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
              className={summaryCardPaddingVariants()}
            >
              <div className="flex items-center gap-3 w-full mb-2">
                <ParticipantAvatar participant={participant} />
                <span className={cn("flex-1", balanceNameVariants())}>
                  {participant.displayName}
                </span>
                <div className={balanceAmountWrapperVariants()}>
                  <span className={balanceAmountVariants()}>
                    {balance.finalAmount.toFixed(0)} ₽
                  </span>
                  {Math.abs(balance.finalAmount - balance.baseAmount) > 0.1 && (
                    <span className={balanceDiffVariants()}>
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
                <div className={cn("w-full", summaryItemIndentVariants())}>
                  <ul className={cn("space-y-1", itemListVariants())}>
                    {balance.items.map((item, idx) => (
                      <li
                        key={idx}
                        className={cn(
                          "flex justify-between items-start",
                          summaryItemRowPaddingVariants(),
                        )}
                      >
                        <div
                          className={cn(
                            "overflow-hidden flex-1",
                            summaryItemContainerPaddingVariants(),
                          )}
                        >
                          <div className={itemNameVariants()}>
                            {item.positionName}
                          </div>
                          {item.description && (
                            <div className={itemDescVariants()}>
                              {item.description}
                            </div>
                          )}
                        </div>
                        <span className={summaryAmountVariants()}>
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
          <div className={emptyStateVariants()}>{t("noClaims")}</div>
        )}
      </div>
    </div>
  );
};
