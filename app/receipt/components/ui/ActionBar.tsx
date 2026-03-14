"use client";

import React from "react";
import { t, type TranslationKey } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  IconActionGroup,
  type IconActionItem,
} from "@/app/receipt/components/ui/IconActionGroup";
import { actionBar, primaryAction } from "@/app/receipt/components/ui-styles";
import { cn } from "@/utils/cn";

interface ActionBarProps {
  visible: boolean;
  leadingActions: IconActionItem[];
  onPrimaryAction: () => void;
  canProceed: boolean;
  primaryLabel: TranslationKey;
  className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  visible,
  leadingActions,
  onPrimaryAction,
  canProceed,
  primaryLabel,
  className,
}) => {
  return (
    <div
      className={cn(
        className,
        "z-10 mx-auto mb-3 w-full max-w-3xl transition-transform duration-300 ease-out",
        visible
          ? "translate-y-0"
          : "pointer-events-none translate-y-[calc(100%+1rem)]",
      )}
    >
      <div className="w-full px-5">
        <div
          className={cn(
            "flex items-center justify-between p-2 backdrop-blur-2xl",
            actionBar,
          )}
        >
          <IconActionGroup
            size="liquid"
            className="justify-center"
            actions={leadingActions}
          />

          <Button
            onClick={onPrimaryAction}
            disabled={!canProceed}
            className={cn("h-12 px-7", primaryAction)}
          >
            {t(primaryLabel)}
          </Button>
        </div>
      </div>
    </div>
  );
};
