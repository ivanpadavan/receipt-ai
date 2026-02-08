"use client";

import React from "react";
import { t } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { ShareReceiptDialog } from "@/app/receipt/components/ShareReceiptDialog";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { iconButtonVariants, iconGroupVariants } from "@/app/receipt/components/ui-styles";
import { Pencil, Users } from "lucide-react";

interface ReceiptActionBarProps {
  receiptId: string;
  isSplitting: boolean;
  participantsCount: number;
  canProceed: boolean;
  onOpenParticipants: () => void;
  onProceed: () => void;
  onBackToEditing: () => void;
}

export const ReceiptActionBar: React.FC<ReceiptActionBarProps> = ({
  receiptId,
  isSplitting,
  participantsCount,
  canProceed,
  onOpenParticipants,
  onProceed,
  onBackToEditing,
}) => {
  return (
    <div className="sticky mb-3 bottom-3 z-10 mx-auto w-full max-w-3xl">
      <div className="ml-auto w-full rounded-[32px] border border-white/70 bg-white/35 p-2 shadow-[0_24px_48px_rgba(15,23,42,0.20)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <ButtonGroup
            className={`justify-center ${iconGroupVariants({ density: "compact" })}`}
          >
            {isSplitting && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={iconButtonVariants({
                    size: "liquid",
                    tone: "muted",
                  })}
                  onClick={onBackToEditing}
                  title={t("edit")}
                  aria-label={t("edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <ButtonGroupSeparator className="mx-1 h-5 opacity-30" />
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              className={`relative ${iconButtonVariants({
                size: "liquid",
                tone: "muted",
              })}`}
              onClick={onOpenParticipants}
              title={t("participants")}
              aria-label={t("participants")}
            >
              <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none opacity-80 text-background">
                {participantsCount}
              </span>
              <Users className="h-4 w-4" />
            </Button>
            <ButtonGroupSeparator className="mx-1 h-5 opacity-30" />
            <ShareReceiptDialog
              receiptId={receiptId}
              iconOnly
              variant="ghost"
              size="sm"
              className={iconButtonVariants({
                size: "liquid",
                tone: "muted",
              })}
              title={t("share")}
            />
          </ButtonGroup>

          <Button
            onClick={onProceed}
            disabled={!canProceed}
            className="h-12 rounded-full px-7 text-base font-semibold shadow-[0_14px_30px_rgba(249,115,22,0.36)]"
          >
            {isSplitting ? t("done") : t("proceed")}
          </Button>
        </div>
      </div>
    </div>
  );
};

