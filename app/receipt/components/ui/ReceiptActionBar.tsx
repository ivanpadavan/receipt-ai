"use client";

import React from "react";
import { t, TranslationKey } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { ShareReceiptDialog } from "@/app/receipt/components/ShareReceiptDialog";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import {
  actionBarVariants,
  iconButtonVariants,
  iconGroupVariants,
  primaryActionVariants,
} from "@/app/receipt/components/ui-styles";
import {
  BadgePercent,
  CirclePlus,
  HandCoins,
  Pencil,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { cva } from "class-variance-authority";

const participantBadgeVariants = cva(
  "pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none opacity-80 text-background",
);

const menuIconVariants = cva("", {
  variants: {
    tone: {
      position: "text-sky-600",
      discount: "text-emerald-600",
      fee: "text-amber-600",
    },
  },
});
const barContainerPaddingVariants = cva("px-5");
const barPaddingVariants = cva("p-2");
const primaryActionPaddingVariants = cva("px-7");

interface ReceiptActionBarProps {
  receiptId: string;
  primaryLabel: TranslationKey;
  participantsCount: number;
  canProceed: boolean;
  onOpenParticipants: () => void;
  onPrimaryAction: () => void;
  onAddPosition?: () => void;
  onAddDiscount?: () => void;
  onAddFee?: () => void;
}

export const ReceiptActionBar: React.FC<ReceiptActionBarProps> = ({
  receiptId,
  primaryLabel,
  participantsCount,
  canProceed,
  onOpenParticipants,
  onPrimaryAction,
  onAddPosition,
  onAddDiscount,
  onAddFee,
}) => {
  const canEditActions = !!(onAddPosition || onAddDiscount || onAddFee);

  return (
    <div className="sticky mb-3 bottom-3 z-10 mx-auto w-full max-w-3xl">
      <div className={cn("w-full", barContainerPaddingVariants())}>
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            actionBarVariants(),
            barPaddingVariants(),
          )}
        >
          <ButtonGroup
            className={`justify-center ${iconGroupVariants({ density: "compact" })}`}
          >
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
              <span className={participantBadgeVariants()}>
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
            {canEditActions && (
              <>
                <ButtonGroupSeparator className="mx-1 h-5 opacity-30" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={iconButtonVariants({
                        size: "liquid",
                        tone: "muted",
                      })}
                      title={t("edit")}
                      aria-label={t("edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" sideOffset={10}>
                    {onAddPosition && (
                      <DropdownMenuItem onClick={onAddPosition}>
                        <CirclePlus
                          className={cn(
                            "mr-2 h-4 w-4",
                            menuIconVariants({ tone: "position" }),
                          )}
                        />
                        {t("addPosition")}
                      </DropdownMenuItem>
                    )}
                    {onAddDiscount && (
                      <DropdownMenuItem onClick={onAddDiscount}>
                        <BadgePercent
                          className={cn(
                            "mr-2 h-4 w-4",
                            menuIconVariants({ tone: "discount" }),
                          )}
                        />
                        {t("addDiscount")}
                      </DropdownMenuItem>
                    )}
                    {onAddFee && (
                      <DropdownMenuItem onClick={onAddFee}>
                        <HandCoins
                          className={cn(
                            "mr-2 h-4 w-4",
                            menuIconVariants({ tone: "fee" }),
                          )}
                        />
                        {t("addFee")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </ButtonGroup>

          <Button
            onClick={onPrimaryAction}
            disabled={!canProceed}
            className={cn("h-12", primaryActionVariants(), primaryActionPaddingVariants())}
          >
            {t(primaryLabel)}
          </Button>
        </div>
      </div>
    </div>
  );
};
