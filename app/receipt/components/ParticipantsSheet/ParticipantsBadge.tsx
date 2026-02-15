"use client";

import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";
import {
  pillVariants,
  iconSizeVariants,
  buttonContentVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";
import { cva } from "class-variance-authority";

// ── Badge-scoped styles ──────────────────────────
const badgeButtonVariants = cva("", {
  variants: {
    size: {
      compact: "h-10",
      full: "",
    },
  },
  defaultVariants: {
    size: "full",
  },
});

interface ParticipantsBadgeProps {
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ParticipantsBadge: React.FC<ParticipantsBadgeProps> = ({
  onClick,
  disabled,
  compact = false,
}) => {
  const count = useParticipantsStore((s) => s.participants.length);

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        title="Участники"
        className={cn(
          pillVariants({
            tone: "ghost",
            radius: "xl",
            interaction: "subtle",
            size: "md",
          }),
          buttonContentVariants({ layout: "inlineTight" }),
          badgeButtonVariants({ size: "compact" }),
        )}
      >
        <Users className={iconSizeVariants({ size: "sm" })} />
        <span
          className={cn(
            "min-w-[1rem]",
            textVariants({ size: "sm", weight: "semibold", align: "center" }),
          )}
        >
          {count}
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      title="Участники"
      className={cn(
        pillVariants({
          tone: "neutral",
          radius: "xl",
          interaction: "accent",
          size: "md",
        }),
        buttonContentVariants({ layout: "inline" }),
        badgeButtonVariants({ size: "full" }),
      )}
    >
      <Users className={iconSizeVariants({ size: "mdTight" })} />
      <span
        className={cn(
          "min-w-[1.25rem]",
          textVariants({ size: "sm", weight: "semibold", align: "center" }),
        )}
      >
        {count}
      </span>
    </Button>
  );
};
