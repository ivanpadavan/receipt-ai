"use client";

import React from "react";
import { cva } from "class-variance-authority";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium text-xs px-2 py-0.5 rounded-full border",
  {
    variants: {
      tone: {
        success: "text-emerald-700 bg-emerald-50 border-emerald-200",
        danger: "text-destructive bg-red-50 border-red-200",
        warning: "text-amber-600 bg-amber-50 border-amber-200",
      },
    },
    defaultVariants: {
      tone: "success",
    },
  },
);

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
      <div className={cn(badgeVariants({ tone: "success" }), className)}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("distributed")}
      </div>
    );
  }

  if (remaining < -0.01) {
    return (
      <div className={cn(badgeVariants({ tone: "danger" }), className)}>
        <XCircle className="h-3.5 w-3.5" />
        {t("overpaid")}: {Math.abs(remaining).toFixed(precision)} ₽
      </div>
    );
  }

  return (
    <div className={cn(badgeVariants({ tone: "warning" }), className)}>
      <AlertTriangle className="h-3.5 w-3.5" />
      {t("remaining")}: {remaining.toFixed(precision)} ₽
    </div>
  );
};
