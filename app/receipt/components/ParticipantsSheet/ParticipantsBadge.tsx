"use client";

import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";
import { pillVariants } from "@/app/receipt/components/ui-styles";
import { cva } from "class-variance-authority";

const countTextVariants = cva("text-sm font-semibold text-center");

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
          badgeButtonVariants({ size: "compact" }),
        )}
      >
        <Users className="mr-1 h-4 w-4" />
        <span className={cn("min-w-[1rem]", countTextVariants())}>
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
        "gap-2",
        badgeButtonVariants({ size: "full" }),
      )}
    >
      <Users className="w-[1.125rem] h-[1.125rem]" />
      <span className={cn("min-w-[1.25rem]", countTextVariants())}>
        {count}
      </span>
    </Button>
  );
};
