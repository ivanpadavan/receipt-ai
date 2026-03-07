import React from "react";
import { cn } from "@/utils/cn";

interface LabelValueRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export const LabelValueRow: React.FC<LabelValueRowProps> = ({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}) => {
  return (
    <span className={cn("flex min-w-0 flex-1 items-center justify-between gap-3", className)}>
      <span className={cn("min-w-0 flex-1 text-left", labelClassName)}>
        {label}
      </span>
      <span className={cn("shrink-0 whitespace-nowrap text-right", valueClassName)}>
        {value}
      </span>
    </span>
  );
};
