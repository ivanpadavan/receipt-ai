"use client";

import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";
import {
  participantsBadgeButtonVariants,
  pillVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";

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
          participantsBadgeButtonVariants({ size: "compact" }),
        )}
      >
        <Users className="mr-1 h-4 w-4" />
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
        "gap-2",
        participantsBadgeButtonVariants({ size: "full" }),
      )}
    >
      <Users className="w-[1.125rem] h-[1.125rem]" />
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
