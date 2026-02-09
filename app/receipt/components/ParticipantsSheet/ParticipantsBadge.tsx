"use client";

import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";
import { pillVariants } from "@/app/receipt/components/ui-styles";
import { cva } from "class-variance-authority";

const countTextVariants = cva("text-sm font-semibold");

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
          }),
          "h-10 px-3 text-sm font-semibold",
        )}
      >
        <Users className="mr-1 h-4 w-4" />
        <span className={cn("min-w-[1rem] text-center", countTextVariants())}>
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
        }),
        "gap-2 px-3 py-2 text-sm font-medium",
      )}
    >
      <Users className="w-[1.125rem] h-[1.125rem]" />
      <span className={cn("min-w-[1.25rem] text-center", countTextVariants())}>
        {count}
      </span>
    </Button>
  );
};
