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
  summaryAmountVariants,
  summaryBalanceAmountWrapperVariants,
  summaryEmptyStateVariants,
  summaryHeaderVariants,
  summaryItemContainerPaddingVariants,
  summaryItemIndentVariants,
  summaryItemListVariants,
  summaryItemRowPaddingVariants,
  textRoleVariants,
} from "@/app/receipt/components/ui-styles";

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
          cardPaddingVariants({ size: "lg" }),
        )}
      >
        <h2
          className={cn(
            "mb-1",
            textRoleVariants({ role: "sectionSubtitle" }),
          )}
        >
          {t("total")}
        </h2>
        <div
          className={textRoleVariants({ role: "amountHero" })}
        >
          {realGrandTotal.toFixed(0)}{" "}
          <span className={textRoleVariants({ role: "amountCurrencyMuted" })}>
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
          "flex-1 overflow-y-auto space-y-3",
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
              <div className="flex items-center gap-3 w-full mb-2">
                <ParticipantAvatar participant={participant} />
                <span
                    className={cn(
                      "flex-1 truncate",
                      textRoleVariants({ role: "headingLg" }),
                    )}
                  >
                    {participant.displayName}
                  </span>
                <div className={summaryBalanceAmountWrapperVariants()}>
                  <span
                    className={textRoleVariants({ role: "amountXl" })}
                  >
                    {balance.finalAmount.toFixed(0)} ₽
                  </span>
                  {Math.abs(balance.finalAmount - balance.baseAmount) > 0.1 && (
                    <span className={textRoleVariants({ role: "captionXsMuted" })}>
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
                  <ul
                    className={cn(
                      "space-y-1",
                      summaryItemListVariants(),
                      textRoleVariants({ role: "labelSmMuted" }),
                    )}
                  >
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
                          <div className={textRoleVariants({ role: "bodyDefault" })}>
                            {item.positionName}
                          </div>
                          {item.description && (
                            <div
                              className={textRoleVariants({ role: "captionXsMuted" })}
                            >
                              {item.description}
                            </div>
                          )}
                        </div>
                        <span
                          className={cn(
                            summaryAmountVariants(),
                            textRoleVariants({ role: "labelSm" }),
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
              summaryEmptyStateVariants(),
              textRoleVariants({ role: "bodyMutedCenter" }),
            )}
          >
            {t("noClaims")}
          </div>
        )}
      </div>
    </div>
  );
};
