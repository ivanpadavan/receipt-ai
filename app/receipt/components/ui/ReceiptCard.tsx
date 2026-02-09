"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { surfaceVariants } from "@/app/receipt/components/ui-styles";

interface ReceiptCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "soft" | "warm" | "warmStrong" | "danger";
  shadow?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  state?: "default" | "active";
  radius?: "xl" | "2xl" | "3xl";
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  tone,
  shadow,
  interactive,
  state,
  radius,
  className,
  ...props
}) => {
  return (
    <Card
      shadow="none"
      className={cn(
        surfaceVariants({ tone, shadow, interactive, state, radius }),
        className,
      )}
      {...props}
    />
  );
};
