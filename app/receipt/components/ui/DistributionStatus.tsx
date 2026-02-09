"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import {
  iconSizeVariants,
  statusPillVariants,
} from "@/app/receipt/components/ui-styles";

interface DistributionStatusProps {
  distributed: number;
  total: number;
  className?: string;
  precision?: number;
}

export const DistributionStatus: React.FC<DistributionStatusProps> = ({
  distributed,
  total,
  className,
  precision = 2,
}) => {
  const remaining = total - distributed;

  if (Math.abs(remaining) <= 0.01) {
    return (
      <div
        className={cn(
          statusPillVariants({ tone: "success", radius: "full" }),
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
          statusPillVariants({ tone: "danger", radius: "full" }),
          className,
        )}
      >
        <XCircle className={iconSizeVariants({ size: "xs" })} />
        {t("overpaid")}: {Math.abs(remaining).toFixed(precision)} ₽
      </div>
    );
  }

  return (
    <div
      className={cn(
        statusPillVariants({ tone: "warning", radius: "full" }),
        className,
      )}
    >
      <AlertTriangle className={iconSizeVariants({ size: "xs" })} />
      {t("remaining")}: {remaining.toFixed(precision)} ₽
    </div>
  );
};
