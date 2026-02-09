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
  iconSizeVariants,
  primaryActionVariants,
  iconLeadSpacingVariants,
  receiptActionBarContainerPaddingVariants,
  receiptActionBarMenuIconVariants,
  receiptActionBarPaddingVariants,
  receiptActionBarParticipantBadgeVariants,
  receiptActionPrimaryPaddingVariants,
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
      <div className={cn("w-full", receiptActionBarContainerPaddingVariants())}>
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            actionBarVariants(),
            receiptActionBarPaddingVariants(),
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
              <span className={receiptActionBarParticipantBadgeVariants()}>
                {participantsCount}
              </span>
              <Users className={iconSizeVariants({ size: "sm" })} />
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
                      <Pencil className={iconSizeVariants({ size: "sm" })} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" sideOffset={10}>
                    {onAddPosition && (
                      <DropdownMenuItem onClick={onAddPosition}>
                        <CirclePlus
                          className={cn(
                            iconLeadSpacingVariants(),
                            iconSizeVariants({ size: "sm" }),
                            receiptActionBarMenuIconVariants({ tone: "position" }),
                          )}
                        />
                        {t("addPosition")}
                      </DropdownMenuItem>
                    )}
                    {onAddDiscount && (
                      <DropdownMenuItem onClick={onAddDiscount}>
                        <BadgePercent
                          className={cn(
                            iconLeadSpacingVariants(),
                            iconSizeVariants({ size: "sm" }),
                            receiptActionBarMenuIconVariants({ tone: "discount" }),
                          )}
                        />
                        {t("addDiscount")}
                      </DropdownMenuItem>
                    )}
                    {onAddFee && (
                      <DropdownMenuItem onClick={onAddFee}>
                        <HandCoins
                          className={cn(
                            iconLeadSpacingVariants(),
                            iconSizeVariants({ size: "sm" }),
                            receiptActionBarMenuIconVariants({ tone: "fee" }),
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
            className={cn(
              "h-12",
              primaryActionVariants(),
              receiptActionPrimaryPaddingVariants(),
            )}
          >
            {t(primaryLabel)}
          </Button>
        </div>
      </div>
    </div>
  );
};
