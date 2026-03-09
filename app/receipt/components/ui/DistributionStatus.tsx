"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import {
  iconSizeVariants,
  pillVariants,
} from "@/app/receipt/components/ui-styles";
import { useMoneyFormatter } from "@/app/receipt/components/receipt-context";

interface DistributionStatusProps {
  distributed: number;
  total: number;
  className?: string;
}

export const DistributionStatus: React.FC<DistributionStatusProps> = ({
  distributed,
  total,
  className,
}) => {
  const { formatMoney } = useMoneyFormatter();
  const remaining = total - distributed;

  if (Math.abs(remaining) <= 0.01) {
    return (
      <div
        className={cn(
          pillVariants({ tone: "success", radius: "full" }),
          className,
        )}
      >
        <CheckCircle2 className={iconSizeVariants({ size: "xs" })} />
        {t("distributed")}
      </div>
    );
  }

  if (remaining < -0.01) {
    return (
      <div
        className={cn(
          pillVariants({ tone: "danger", radius: "full" }),
          className,
        )}
      >
        <XCircle className={iconSizeVariants({ size: "xs" })} />
        {t("overpaid")}: {formatMoney(Math.abs(remaining))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        pillVariants({ tone: "warning", radius: "full" }),
        className,
      )}
    >
      <AlertTriangle className={iconSizeVariants({ size: "xs" })} />
      {t("remaining")}: {formatMoney(remaining)}
    </div>
  );
};
