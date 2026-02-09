"use client";

import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";
import {
  participantsBadgeButtonVariants,
  pillVariants,
  iconSizeVariants,
  textRoleVariants,
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
        <Users className={cn("mr-1", iconSizeVariants({ size: "sm" }))} />
        <span
          className={cn(
            "min-w-[1rem]",
            textRoleVariants({ role: "badgeCount" }),
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
      <Users className={iconSizeVariants({ size: "mdTight" })} />
      <span
        className={cn(
          "min-w-[1.25rem]",
          textRoleVariants({ role: "badgeCount" }),
        )}
      >
        {count}
      </span>
    </Button>
  );
};
