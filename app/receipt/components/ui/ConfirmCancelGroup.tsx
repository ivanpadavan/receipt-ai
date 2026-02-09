"use client";

import React from "react";
import { cva } from "class-variance-authority";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const groupVariants = cva(
  "inline-flex items-center rounded-full border border-border/60 bg-white/70 shadow-sm",
  {
    variants: {
      size: {
        sm: "h-10 px-1",
        md: "h-12 px-1.5",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

const buttonVariants = cva("rounded-full transition", {
  variants: {
    size: {
      sm: "h-8 w-10",
      md: "h-9 w-12",
    },
    tone: {
      cancel: "text-muted-foreground hover:text-foreground",
      confirm: "text-emerald-600 hover:text-emerald-700",
    },
  },
  defaultVariants: {
    size: "sm",
    tone: "cancel",
  },
});

const dividerVariants = cva("bg-border/60");

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
    <div className={cn(groupVariants({ size }), className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(buttonVariants({ size, tone: "cancel" }))}
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className={cn("h-6 w-px", dividerVariants())} />
      <Button
        variant="ghost"
        size="icon"
        className={cn(buttonVariants({ size, tone: "confirm" }))}
        onClick={onConfirm}
        disabled={confirmDisabled}
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
};
