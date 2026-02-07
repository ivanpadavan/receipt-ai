"use client";

import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";

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
        className="h-10 rounded-xl px-3 text-muted-foreground hover:text-foreground"
      >
        <Users className="mr-1 h-4 w-4" />
        <span className="text-sm font-semibold min-w-[1rem] text-center">
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
        "inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-500 font-medium transition-all duration-200",
        "hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/5 hover:shadow-md",
      )}
    >
      <Users className="w-[1.125rem] h-[1.125rem]" />
      <span className="text-sm font-semibold min-w-[1.25rem] text-center">
        {count}
      </span>
    </Button>
  );
};
