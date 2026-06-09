"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { t } from "@/app/i18n/translations";
import { textVariants } from "@/app/receipt/components/ui-styles";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = Infinity,
  className,
}) => {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted/60 p-1",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-background shadow-sm disabled:opacity-40 disabled:shadow-none"
        aria-label={t("decrease")}
        title={t("decrease")}
        disabled={!canDecrease}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span
        className={cn(
          "min-w-7 text-center tabular-nums",
          textVariants({ weight: "semibold" }),
        )}
        data-testid="quantity-stepper-value"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-background shadow-sm disabled:opacity-40 disabled:shadow-none"
        aria-label={t("increase")}
        title={t("increase")}
        disabled={!canIncrease}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
