"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  confirmCancelButtonVariants,
  confirmCancelDividerVariants,
  confirmCancelGroupVariants,
} from "@/app/receipt/components/ui-styles";

interface ConfirmCancelGroupProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export const ConfirmCancelGroup: React.FC<ConfirmCancelGroupProps> = ({
  onCancel,
  onConfirm,
  confirmDisabled,
  size = "sm",
  className,
}) => {
  return (
    <div className={cn(confirmCancelGroupVariants({ size }), className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(confirmCancelButtonVariants({ size, tone: "cancel" }))}
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className={cn("h-6 w-px", confirmCancelDividerVariants())} />
      <Button
        variant="ghost"
        size="icon"
        className={cn(confirmCancelButtonVariants({ size, tone: "confirm" }))}
        onClick={onConfirm}
        disabled={confirmDisabled}
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
};
