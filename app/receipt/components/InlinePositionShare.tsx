"use client";

import React, { useMemo } from "react";

import { ReceiptPosition } from "@/model/receipt/model";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import { useUser } from "@/context/AuthContext";
import { useMoneyFormatter, useReceiptState } from "./receipt-context";
import { Checkbox } from "@/components/ui/checkbox";
import { QuantityStepper } from "@/app/receipt/components/ui/QuantityStepper";
import {
  findMyQuantityClaim,
  getClaimAmount,
  getDistributedPositionAmount,
  getMyInlineMaxQuantity,
  setMyQuantity,
} from "@/app/receipt/utils/claims";
import {
  divider,
  rowVariants,
  stackGapVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";

interface InlinePositionShareProps {
  position: ReceiptPosition;
  index: number;
}

export const InlinePositionShare: React.FC<InlinePositionShareProps> = ({
  position,
  index,
}) => {
  const { user } = useUser();
  const { updatePosition } = useReceiptState();
  const { formatMoney } = useMoneyFormatter();
  const userId = user?.id;

  const myClaim = useMemo(
    () => findMyQuantityClaim(position.claims, userId),
    [position.claims, userId],
  );
  const myQty = myClaim?.value ?? 0;
  const maxQty = useMemo(
    () => getMyInlineMaxQuantity(position, userId),
    [position, userId],
  );
  const checked = maxQty > 0 && myQty === maxQty;
  const distributed = getDistributedPositionAmount(
    position.claims,
    position.price,
  );
  const myAmount = myClaim ? getClaimAmount(myClaim, position.price) : 0;

  const commit = (nextQty: number) => {
    if (!userId) return;
    updatePosition(index, setMyQuantity(position, userId, nextQty));
  };

  return (
    <div className={cn("px-3 pb-3", stackGapVariants({ size: "sm" }))}>
      <div className={cn("mb-1", divider)} />
      <div
        className={cn(
          rowVariants({ align: "center", justify: "between", width: "full" }),
        )}
      >
        <label className="flex min-w-0 items-center gap-3">
          <Checkbox
            checked={checked}
            disabled={maxQty === 0}
            onCheckedChange={(next) => commit(next ? maxQty : 0)}
            aria-label={t("yourShare")}
          />
          <span className="min-w-0">
            <span className={textVariants({ weight: "medium" })}>
              {t("yourShare")}
            </span>
            {myQty > 0 && (
              <span
                className={cn("ml-2", textVariants({ size: "sm", tone: "muted" }))}
              >
                {myQty} {t("pcs")} = {formatMoney(myAmount)}
              </span>
            )}
          </span>
        </label>

        <QuantityStepper
          value={myQty}
          max={maxQty}
          onChange={commit}
        />
      </div>
      <div
        className={cn(
          rowVariants({ justify: "between", width: "full" }),
          textVariants({ size: "sm" }),
        )}
      >
        <span className={textVariants({ size: "sm", tone: "muted" })}>
          {t("distributed")}
        </span>
        <span className="font-medium tabular-nums">
          {formatMoney(distributed, "")} / {formatMoney(position.overall)}
        </span>
      </div>
    </div>
  );
};
