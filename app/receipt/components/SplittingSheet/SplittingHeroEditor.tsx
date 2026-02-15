"use client";

import React, { useMemo } from "react";

import { t } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { cn } from "@/utils/cn";
import {
  avatarSizeVariants,
  radiusTokens,
  rowVariants,
  splittingParticipantButtonVariants,
  splittingTypeSwitchButtonVariants,
  splittingTypeSwitchWrapperVariants,
  textRoleVariants,
} from "@/app/receipt/components/ui-styles";
import { ParticipantDTO, ReceiptPositionClaim } from "@/model/receipt/model";

interface SplittingHeroEditorProps {
  claim: ReceiptPositionClaim;
  participants: ParticipantDTO[];
  saveDisabled: boolean;
  allParticipantsSelected: boolean;
  onUpdate: (claim: ReceiptPositionClaim) => void;
  onCancel: () => void;
  onSave: () => void;
}

const formatClaimValue = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toFixed(0);
  }

  return value.toFixed(2).replace(/\.0+$/, "").replace(/(\.[1-9]*)0+$/, "$1");
};

const parseInputValue = (value: string) => {
  const normalized = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");

  if (!normalized) {
    return 0;
  }

  const [integerPart, ...decimalParts] = normalized.split(".");
  const safeValue = decimalParts.length
    ? `${integerPart}.${decimalParts.join("")}`
    : integerPart;

  const parsed = Number.parseFloat(safeValue);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const SplittingHeroEditor: React.FC<SplittingHeroEditorProps> = ({
  claim,
  participants,
  saveDisabled,
  allParticipantsSelected,
  onUpdate,
  onCancel,
  onSave,
}) => {
  const allParticipantIds = useMemo(
    () => participants.map((participant) => participant.id),
    [participants],
  );

  return (
    <div
      className={cn(
        "relative",
        "focus-within:fixed focus-within:inset-0 focus-within:z-50 focus-within:overflow-y-auto",
        "focus-within:bg-background/95 focus-within:px-3 focus-within:pt-[calc(env(safe-area-inset-top)+0.75rem)] focus-within:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        "md:focus-within:static md:focus-within:inset-auto md:focus-within:z-auto md:focus-within:overflow-visible",
        "md:focus-within:bg-transparent md:focus-within:px-0 md:focus-within:pt-0 md:focus-within:pb-0",
      )}
    >
      <div className="w-full focus-within:mx-auto focus-within:max-w-3xl">
        <ReceiptCard
          tone="warm"
          shadow="sm"
          radius="2xl"
          className="overflow-hidden border-amber-200/70"
        >
          <div className="px-3 pt-3 pb-2">
            <div className={rowVariants({ justify: "between", align: "start", width: "full" })}>
              <Input
                type="text"
                inputMode="decimal"
                className="h-16 min-w-0 flex-1 border-0 bg-transparent px-0 text-center text-5xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
                value={claim.value > 0 ? formatClaimValue(claim.value) : ""}
                onChange={(event) =>
                  onUpdate({
                    ...claim,
                    value: parseInputValue(event.target.value),
                  })
                }
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !saveDisabled) {
                    onSave();
                  }
                  if (event.key === "Escape") {
                    onCancel();
                  }
                }}
              />

              <div
                className={cn(
                  "flex items-center",
                  splittingTypeSwitchWrapperVariants(),
                  radiusTokens.full,
                )}
              >
                <button
                  type="button"
                  className={cn(
                    splittingTypeSwitchButtonVariants({
                      active: claim.type === "quantity",
                    }),
                    radiusTokens.full,
                  )}
                  aria-pressed={claim.type === "quantity"}
                  onClick={() => onUpdate({ ...claim, type: "quantity" })}
                >
                  ШТ
                </button>
                <button
                  type="button"
                  className={cn(
                    splittingTypeSwitchButtonVariants({
                      active: claim.type === "amount",
                    }),
                    radiusTokens.full,
                  )}
                  aria-pressed={claim.type === "amount"}
                  onClick={() => onUpdate({ ...claim, type: "amount" })}
                >
                  ₽
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 px-3 py-3">
            <div className="mb-2 flex w-full items-center justify-between">
              <span className={textRoleVariants({ role: "overlineMuted" })}>
                {t("splitBetween")}
              </span>
              <button
                type="button"
                className={textRoleVariants({ role: "metaSmBrandStrong" })}
                disabled={participants.length === 0}
                onClick={() =>
                  onUpdate({
                    ...claim,
                    participantIds: allParticipantsSelected ? [] : allParticipantIds,
                  })
                }
              >
                {allParticipantsSelected ? t("clearAll") : t("selectAll")}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => {
                const selected = claim.participantIds.includes(participant.id);

                return (
                  <button
                    key={participant.id}
                    type="button"
                    className={splittingParticipantButtonVariants({ selected })}
                    onClick={() => {
                      if (selected) {
                        onUpdate({
                          ...claim,
                          participantIds: claim.participantIds.filter(
                            (participantId) => participantId !== participant.id,
                          ),
                        });
                        return;
                      }

                      onUpdate({
                        ...claim,
                        participantIds: [...claim.participantIds, participant.id],
                      });
                    }}
                  >
                    <ParticipantAvatar
                      participant={participant}
                      className={avatarSizeVariants({ size: "sm" })}
                      showRing={selected}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex w-full items-center gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                {t("cancel")}
              </Button>
              <Button type="button" className="flex-1" onClick={onSave} disabled={saveDisabled}>
                {t("save")}
              </Button>
            </div>
          </div>
        </ReceiptCard>
      </div>
    </div>
  );
};

