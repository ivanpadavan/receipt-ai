"use client";

import React, { useMemo } from "react";
import { Receipt } from "@/model/receipt/model";
import { calculateBalances } from "@/app/receipt/utils/calculator";
import { t } from "@/app/i18n/translations";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { AlertCircle } from "lucide-react";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { DistributionStatus } from "@/app/receipt/components/ui/DistributionStatus";

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
      <div className="p-6 text-center border-b bg-card relative">
        <h2 className="text-lg font-medium text-muted-foreground mb-1">
          {t("total")}
        </h2>
        <div className="text-4xl font-bold text-foreground">
          {realGrandTotal.toFixed(0)}{" "}
          <span className="text-2xl text-muted-foreground">₽</span>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {balances.map((balance) => {
          const participant = participants.find(
            (p) => p.id === balance.participantId,
          );
          if (!participant) return null;

          return (
            <div
              key={balance.participantId}
              className="flex flex-col w-full p-3 border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3 w-full mb-2">
                <ParticipantAvatar participant={participant} />
                <span className="font-medium text-lg flex-1 text-left truncate">
                  {participant.displayName}
                </span>
                <div className="text-right">
                  <span className="font-bold text-xl block">
                    {balance.finalAmount.toFixed(0)} ₽
                  </span>
                  {Math.abs(balance.finalAmount - balance.baseAmount) > 0.1 && (
                    <span className="text-xs text-muted-foreground">
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
                <div className="pl-12 w-full">
                  <ul className="text-sm space-y-1 text-muted-foreground border-t pt-2 border-border/40">
                    {balance.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-start py-1"
                      >
                        <div className="overflow-hidden pr-2 flex-1">
                          <div className="truncate text-foreground">
                            {item.positionName}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <span className="whitespace-nowrap font-medium">
                          {item.rawAmount.toFixed(0)} ₽
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {balances.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            {t("noClaims")}
          </div>
        )}
      </div>
    </div>
  );
};
