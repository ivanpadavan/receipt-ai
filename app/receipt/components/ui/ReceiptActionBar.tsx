"use client";

import React, { useCallback } from "react";
import { flushSync } from "react-dom";
import { t, type TranslationKey } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { ShareReceiptDialog } from "@/app/receipt/components/ShareReceiptDialog";
import { ActionMenu } from "@/app/receipt/components/ui/ActionMenu";
import { ActionBar } from "@/app/receipt/components/ui/ActionBar";
import {
  type IconActionItem,
  type IconActionRenderProps,
} from "@/app/receipt/components/ui/IconActionGroup";
import {
  iconSizeVariants,
  iconLeadSpacingVariants,
  radiusTokens,
} from "@/app/receipt/components/ui-styles";
import {
  BadgePercent,
  CirclePlus,
  HandCoins,
  Pencil,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { cva } from "class-variance-authority";

const participantBadge =
  `${radiusTokens.full} pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center bg-foreground px-1 text-[10px] font-semibold leading-none opacity-80 text-background`;

const menuIconVariants = cva("", {
  variants: {
    tone: {
      position: "text-sky-600",
      discount: "text-emerald-600",
      fee: "text-amber-600",
    },
  },
});

interface ReceiptActionBarProps {
  receiptId: string;
  primaryLabel: TranslationKey;
  participantsCount: number;
  canProceed: boolean;
  showSearch?: boolean;
  isSearchOpen?: boolean;
  onOpenSearch?: () => void;
  onOpenParticipants: () => void;
  onPrimaryAction: () => void;
  onEditReceiptName?: () => void;
  onAddPosition?: () => void;
  onAddDiscount?: () => void;
  onAddFee?: () => void;
}

export const ReceiptActionBar: React.FC<ReceiptActionBarProps> = ({
  receiptId,
  primaryLabel,
  participantsCount,
  canProceed,
  showSearch = false,
  isSearchOpen = false,
  onOpenSearch,
  onOpenParticipants,
  onPrimaryAction,
  onEditReceiptName,
  onAddPosition,
  onAddDiscount,
  onAddFee,
}) => {
  const canEditActions = !!(
    onEditReceiptName ||
    onAddPosition ||
    onAddDiscount ||
    onAddFee
  );

  const handleOpenSearch = useCallback(() => {
    if (!onOpenSearch) return;
    flushSync(onOpenSearch);
  }, [onOpenSearch]);

  const leadingActions: IconActionItem[] = [
    {
      id: "participants",
      label: t("participants"),
      onClick: onOpenParticipants,
      className: "relative",
      icon: (
        <>
          <span className={participantBadge}>{participantsCount}</span>
          <Users className={iconSizeVariants({ size: "sm" })} />
        </>
      ),
    },
    {
      id: "share",
      label: t("share"),
      render: ({ className, label, disabled }) => (
        <ShareReceiptDialog
          receiptId={receiptId}
          iconOnly
          variant="ghost"
          size="sm"
          className={className}
          title={label}
          disabled={disabled}
        />
      ),
    },
    ...(canEditActions
      ? [{
          id: "edit",
          label: t("edit"),
          render: ({ className, label }: IconActionRenderProps) => (
            <ActionMenu
              triggerLabel={label}
              triggerKind="actionBar"
              triggerClassName={className}
              triggerIcon={<Pencil className={iconSizeVariants({ size: "sm" })} />}
              contentAlign="start"
              contentSide="top"
              items={[
                ...(onEditReceiptName
                  ? [{
                      id: "edit-receipt-name",
                      label: t("editReceipt"),
                      onSelect: onEditReceiptName,
                      icon: (
                        <Pencil
                          className={cn(
                            iconLeadSpacingVariants(),
                            iconSizeVariants({ size: "sm" }),
                          )}
                        />
                      ),
                    }]
                  : []),
                ...(onAddPosition
                  ? [{
                      id: "add-position",
                      label: t("addPosition"),
                      onSelect: onAddPosition,
                      icon: (
                        <CirclePlus
                          className={cn(
                            iconLeadSpacingVariants(),
                            iconSizeVariants({ size: "sm" }),
                            menuIconVariants({ tone: "position" }),
                          )}
                        />
                      ),
                    }]
                  : []),
                ...(onAddDiscount
                  ? [{
                      id: "add-discount",
                      label: t("addDiscount"),
                      onSelect: onAddDiscount,
                      icon: (
                        <BadgePercent
                          className={cn(
                            iconLeadSpacingVariants(),
                            iconSizeVariants({ size: "sm" }),
                            menuIconVariants({ tone: "discount" }),
                          )}
                        />
                      ),
                    }]
                  : []),
                ...(onAddFee
                  ? [{
                      id: "add-fee",
                      label: t("addFee"),
                      onSelect: onAddFee,
                      icon: (
                        <HandCoins
                          className={cn(
                            iconLeadSpacingVariants(),
                            iconSizeVariants({ size: "sm" }),
                            menuIconVariants({ tone: "fee" }),
                          )}
                        />
                      ),
                    }]
                  : []),
              ]}
            />
          ),
        }]
      : []),
    ...(showSearch
      ? [{
          id: "search",
          label: t("search"),
          render: ({ className }: IconActionRenderProps) => (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleOpenSearch}
              aria-label={t("search")}
              title={t("search")}
              className={className}
            >
              <Search className={iconSizeVariants({ size: "sm" })} />
            </Button>
          ),
        }]
      : []),
  ];

  return (
    <ActionBar
      className="sticky bottom-0"
      visible={!isSearchOpen}
      leadingActions={leadingActions}
      onPrimaryAction={onPrimaryAction}
      canProceed={canProceed}
      primaryLabel={primaryLabel}
    />
  );
};
