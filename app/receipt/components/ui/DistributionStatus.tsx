"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import { pillVariants } from "@/app/receipt/components/ui-styles";

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
          pillVariants({ tone: "success", radius: "full", size: "sm" }),
          className,
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("distributed")}
      </div>
    );
  }

  if (remaining < -0.01) {
    return (
      <div
        className={cn(
          pillVariants({ tone: "danger", radius: "full", size: "sm" }),
          className,
        )}
      >
        <XCircle className="h-3.5 w-3.5" />
        {t("overpaid")}: {Math.abs(remaining).toFixed(precision)} ₽
      </div>
    );
  }

  return (
    <div
      className={cn(
        pillVariants({ tone: "warning", radius: "full", size: "sm" }),
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {t("remaining")}: {remaining.toFixed(precision)} ₽
    </div>
  );
};
