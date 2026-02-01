import React from 'react';
import { useReceiptState } from "../ReceiptForm";
import { useObservable } from "@/hooks/rx/useObservable";
import { cn } from "@/utils/cn";

import {
  Receipt,
  ReceiptPosition,
  ReceiptPositionClaim,
} from "@/model/receipt/model";

type DistributionData = ReceiptPositionClaim | ReceiptPosition | Receipt;

interface DistributionBarProps {
  data: DistributionData;
  className?: string;
  children?: React.ReactNode;
}

const isReceipt = (data: DistributionData): data is Receipt => {
  return 'positions' in data && Array.isArray(data.positions);
}

const isPosition = (data: DistributionData): data is ReceiptPosition => {
  return 'claims' in data && Array.isArray(data.claims) && 'price' in data;
}


export const DistributionBar = ({
  data,
  className,
  children,
}: DistributionBarProps) => {
  const {
    scenario: { form },
  } = useReceiptState();

  useObservable(form.controls.participants.valueChanges);
  const participants = form.controls.participants.getRawValue();

  // Aggregate amounts per participant
  const participantAmounts = new Map<string, number>();
  let calculatedTotal = 0;

  const processClaim = (claim: ReceiptPositionClaim, itemPrice: number) => {
    // If we don't have price (itemPrice=1), we just calculate based on value (quantity or amount).
    // This is fine for single-claim bars where relative proportions matter, not absolute currency.
    const amount = claim.type === "quantity" ? claim.value * itemPrice : claim.value;
    const pIds = claim.participantIds || [];

    if (pIds.length > 0) {
      const splitAmount = amount / pIds.length;
      pIds.forEach((pid) => {
        participantAmounts.set(pid, (participantAmounts.get(pid) || 0) + splitAmount);
      });
    }
    return amount; // Return the total amount for this claim
  };

  if (isReceipt(data)) {
    calculatedTotal = data.totals.total;
    data.positions.forEach((pos) => {
      pos.claims.forEach((c) => processClaim(c, pos.price));
    });
  } else if (isPosition(data)) {
    calculatedTotal = data.overall;
    data.claims.forEach((c) => processClaim(c, data.price));
  } else {
    // Single Claim
    // For a single claim, the "total" is just its own calculated amount.
    // We use price=1 effectively treating quantity as the unit for visualization if needed,
    // or if the claim is 'amount' type it works directly.
    // Since we only care about the split ratios in the mini-bar, the price multiplier cancels out 
    // (a * p / (N * a * p) = 1/N).
    calculatedTotal = processClaim(data, 1);
  }

  // Convert to array.
  // We respect the order of participants (usually "Me" is first), so the current user's segment appears first.
  const bars = participants
    .map((p) => ({
      ...p,
      amount: participantAmounts.get(p.id) || 0,
    }))
    .filter((p) => p.amount > 0);

  return (
    <div
      className={cn("w-full bg-secondary overflow-hidden flex relative", className)}
    >
      {bars.map((bar, i) => {
        const style: React.CSSProperties = {
          backgroundColor: bar.color,
        };

        if (calculatedTotal > 0) {
          const percent = (bar.amount / calculatedTotal) * 100;
          style.width = `${percent}%`;
        } else {
          // If no total allowed, this mode is weird for aggregated view. 
          // Usually total is passed for the footer bar.
          // If used in row, total might be missing.
          // If used in row (mini bar), we usually just want to fill.
          style.flex = 1;
        }

        return (
          <div
            key={bar.id}
            style={style}
            title={`${bar.name}: ${bar.amount.toFixed(2)}`}
            className="h-full transition-all flex items-center justify-center relative overflow-hidden"
          />
        );
      })}
      {children}
    </div>
  );
};
