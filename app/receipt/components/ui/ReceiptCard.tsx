"use client";

import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { surfaceVariants } from "@/app/receipt/components/ui-styles";

interface ReceiptCardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  tone?: "default" | "soft" | "warm" | "warmStrong" | "success" | "danger";
  shadow?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  state?: "default" | "active";
  radius?: "xl" | "2xl" | "3xl";
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  asChild = false,
  tone,
  shadow,
  interactive,
  state,
  radius,
  className,
  ...props
}) => {
  const Comp = asChild ? Slot : Card;

  return (
    <Comp
      {...(!asChild ? { shadow: "none" as const } : {})}
      className={cn(
        surfaceVariants({ tone, shadow, interactive, state, radius }),
        className,
      )}
      {...props}
    />
  );
};
