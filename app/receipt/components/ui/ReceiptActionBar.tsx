"use client";

import React from "react";
import { t, TranslationKey } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { ShareReceiptDialog } from "@/app/receipt/components/ShareReceiptDialog";
import { ActionMenu } from "@/app/receipt/components/ui/ActionMenu";
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
  inlineGapVariants,
  rowVariants,
} from "@/app/receipt/components/ui-styles";
import {
  BadgePercent,
  CirclePlus,
  HandCoins,
  Pencil,
  Users,
} from "lucide-react";
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
            rowVariants({ align: "center", justify: "between", width: "full" }),
            inlineGapVariants({ size: "md" }),
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
                <ActionMenu
                  triggerLabel={t("edit")}
                  triggerKind="actionBar"
                  triggerIcon={<Pencil className={iconSizeVariants({ size: "sm" })} />}
                  contentAlign="start"
                  contentSide="top"
                  items={[
                    ...(onAddPosition
                      ? [
                          {
                            id: "add-position",
                            label: t("addPosition"),
                            onSelect: onAddPosition,
                            icon: (
                              <CirclePlus
                                className={cn(
                                  iconLeadSpacingVariants(),
                                  iconSizeVariants({ size: "sm" }),
                                  receiptActionBarMenuIconVariants({
                                    tone: "position",
                                  }),
                                )}
                              />
                            ),
                          },
                        ]
                      : []),
                    ...(onAddDiscount
                      ? [
                          {
                            id: "add-discount",
                            label: t("addDiscount"),
                            onSelect: onAddDiscount,
                            icon: (
                              <BadgePercent
                                className={cn(
                                  iconLeadSpacingVariants(),
                                  iconSizeVariants({ size: "sm" }),
                                  receiptActionBarMenuIconVariants({
                                    tone: "discount",
                                  }),
                                )}
                              />
                            ),
                          },
                        ]
                      : []),
                    ...(onAddFee
                      ? [
                          {
                            id: "add-fee",
                            label: t("addFee"),
                            onSelect: onAddFee,
                            icon: (
                              <HandCoins
                                className={cn(
                                  iconLeadSpacingVariants(),
                                  iconSizeVariants({ size: "sm" }),
                                  receiptActionBarMenuIconVariants({
                                    tone: "fee",
                                  }),
                                )}
                              />
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
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
