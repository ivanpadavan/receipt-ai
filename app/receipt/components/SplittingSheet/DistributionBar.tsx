import React from 'react';
import { useReceiptState } from "../ReceiptForm";
import { useObservable } from "@/hooks/rx/useObservable";
import { cn } from "@/utils/cn";
import { ClaimForm } from "@/app/receipt/[id]/receipt-state";

type ClaimValue = ReturnType<ClaimForm['getRawValue']>;

interface DistributionBarProps {
  claims: ClaimValue | ClaimValue[];
  total?: number; // Total value to calculate percentages against.
  price: number; // Price of the position, needed for quantity -> amount conversion
  className?: string;
  children?: React.ReactNode;
}


export const DistributionBar = ({
  claims,
  total,
  price,
  className,
  children,
}: DistributionBarProps) => {
  const {
    scenario: { form },
  } = useReceiptState();

  useObservable(form.controls.participants.valueChanges);
  const participants = form.controls.participants.getRawValue();

  const claimList = Array.isArray(claims) ? claims : [claims];

  return (
    <div
      className={cn("w-full bg-secondary overflow-hidden flex relative", className)}
    >
      {claimList.map((claim, i) => {
        const amount =
          claim.type === "quantity" ? claim.value * price : claim.value;
        const pIds = claim.participantIds || [];

        // Resolve color
        // If multiple participants, we currently only show the first one's color
        // This matches the previous logic of the "separate row" bar.
        const color =
          pIds.length > 0
            ? participants.find((p) => p.id === pIds[0])?.color
            : undefined;

        // Fallback color for empty claims: slate-200 (#e2e8f0)
        const backgroundColor = color || "#e2e8f0";

        // Resolve width
        const style: React.CSSProperties = {
          backgroundColor,
        };

        if (total) {
          // Global bar mode: calculate percentage
          const percent = (amount / total) * 100;
          style.width = `${percent}%`;
        } else {
          // Local bar mode: fill available space (flex-1)
          style.flex = 1;
        }

        const tooltip = pIds
          .map((id) => participants.find((p) => p.id === id)?.name)
          .filter(Boolean)
          .join(", ");

        return (
          <div
            key={i}
            style={style}
            title={tooltip}
            className="h-full transition-all flex items-center justify-center relative overflow-hidden"
          ></div>
        );
      })}
      {children}
    </div>
  );
};
