"use client";

import React, { useCallback } from "react";
import { flushSync } from "react-dom";
import { t, TranslationKey } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { ShareReceiptDialog } from "@/app/receipt/components/ShareReceiptDialog";
import { ActionMenu } from "@/app/receipt/components/ui/ActionMenu";
import {
  IconActionGroup,
  type IconActionRenderProps,
} from "@/app/receipt/components/ui/IconActionGroup";
import {
  actionBar,
  iconSizeVariants,
  primaryAction,
  iconLeadSpacingVariants,
  inlineGapVariants,
  rowVariants,
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

// ── ActionBar-scoped styles ──────────────────────
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
const containerPadding = "px-5";
const barPadding = "p-2";
const primaryPadding = "px-7";

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
  onAddPosition,
  onAddDiscount,
  onAddFee,
}) => {
  const canEditActions = !!(onAddPosition || onAddDiscount || onAddFee);
  const handleOpenSearch = useCallback(() => {
    if (!onOpenSearch) return;
    flushSync(onOpenSearch);
  }, [onOpenSearch]);

  return (
    <div
      className={cn(
        "sticky mb-3 bottom-3 z-10 mx-auto w-full max-w-3xl transition-transform duration-300 ease-out will-change-transform",
        isSearchOpen ? "translate-y-[calc(100%+1rem)]" : "translate-y-0",
      )}
    >
      <div className={cn("w-full", containerPadding)}>
        <div
          className={cn(
            rowVariants({ align: "center", justify: "between", width: "full" }),
            inlineGapVariants({ size: "md" }),
            actionBar,
            'backdrop-blur-2xl',
            barPadding,
          )}
        >
          <IconActionGroup
            size="liquid"
            className="justify-center"
            actions={[
              {
                id: "participants",
                label: t("participants"),
                onClick: onOpenParticipants,
                className: "relative",
                icon: (
                  <>
                    <span className={participantBadge}>
                      {participantsCount}
                    </span>
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
                ? [
                  {
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
                                      menuIconVariants({
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
                                      menuIconVariants({
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
                                      menuIconVariants({
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
                    ),
                  },
                ]
                : []),
              ...(showSearch
                ? [
                  {
                    id: "search",
                    label: t("search"),
                    render: ({ className }: IconActionRenderProps) => (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleOpenSearch}
                        aria-label="Search"
                        title="Search"
                        className={className}
                      >
                        <Search className={iconSizeVariants({ size: "sm" })} />
                      </Button>
                    ),
                  },
                ]
                : []),
            ]}
          />

          <Button
            onClick={onPrimaryAction}
            disabled={!canProceed}
            className={cn(
              "h-12",
              primaryAction,
              primaryPadding,
            )}
          >
            {t(primaryLabel)}
          </Button>
        </div>
      </div>
    </div>
  );
};
