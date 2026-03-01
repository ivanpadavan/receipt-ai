"use client";

import React, { useEffect, useMemo, useState } from "react";

import { t } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { cn } from "@/utils/cn";
import {
  avatarSizeVariants,
  inlineGapVariants,
  radiusTokens,
  rowVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";
import { ParticipantDTO, ReceiptPositionClaim } from "@/model/receipt/model";
import { cva } from "class-variance-authority";
import { ButtonGroup } from "@/components/ui/button-group";

// ── SplittingHeroEditor-scoped styles ──────────────
const typeSwitchWrapper =
  "border border-border/60 bg-muted/30 p-1 shadow-sm";
const typeSwitchButtonVariants = cva(
  "h-8 w-16 text-xs font-semibold transition",
  {
    variants: {
      active: {
        true: "bg-white text-foreground shadow",
        false: "text-muted-foreground",
      },
    },
  },
);
const participantButtonVariants = cva(
  `relative ${radiusTokens.full} transition-all`,
  {
    variants: {
      selected: {
        true: "",
        false: "opacity-50 hover:opacity-80",
      },
    },
    defaultVariants: {
      selected: true,
    },
  },
);

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

const useTransientPreventScrollHack = (durationMs = 3000) => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setEnabled(false);
    }, durationMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [durationMs]);

  return enabled ? "prevent_scrolling_when_focus" : "";
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
  const preventScrollHackClass = useTransientPreventScrollHack();

  const allParticipantIds = useMemo(
    () => participants.map((participant) => participant.id),
    [participants],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saveDisabled) {
      return;
    }

    onSave();
  };

  const editorCard = (
    <ReceiptCard
      tone="warm"
      shadow="sm"
      radius="2xl"
      className="overflow-hidden border-amber-200/70"
    >
      <div className="px-3 pt-3 pb-2">
        <div
          className={rowVariants({
            justify: "between",
            align: "start",
            width: "full",
          })}
        >
          <Input
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            className={cn(
              "h-16 min-w-0 flex-1 border-0 bg-transparent px-0 text-center text-5xl font-semibold tabular-nums shadow-none focus-visible:ring-0",
              preventScrollHackClass,
            )}
            value={claim.value > 0 ? formatClaimValue(claim.value) : ""}
            onChange={(event) =>
              onUpdate({
                ...claim,
                value: parseInputValue(event.target.value),
              })
            }
            autoFocus
          />
        </div>
        <div
          className={cn(
            inlineGapVariants({ size: "sm" }),
            rowVariants({ justify: "between" }),
          )}
        >
          <ButtonGroup orientation="horizontal">
            <Button variant="outline">A</Button>
            <Button variant="outline">B</Button>
            <Button variant="outline">C</Button>
          </ButtonGroup>
          <div
            className={cn(
              "flex items-center",
              typeSwitchWrapper,
              radiusTokens.full,
            )}
          >
            <button
              type="button"
              className={cn(
                typeSwitchButtonVariants({
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
                typeSwitchButtonVariants({
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
          <span
            className={textVariants({
              size: "sm",
              weight: "semibold",
              tone: "muted",
              style: "caps",
            })}
          >
            {t("splitBetween")}
          </span>
          <button
            type="button"
            className={textVariants({ size: "sm", tone: "brandStrong" })}
            disabled={participants.length === 0}
            onClick={() =>
              onUpdate({
                ...claim,
                participantIds: allParticipantsSelected
                  ? []
                  : allParticipantIds,
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
                className={participantButtonVariants({ selected })}
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
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" className="flex-1" disabled={saveDisabled}>
            {t("save")}
          </Button>
        </div>
      </div>
    </ReceiptCard>
  );

  return (
    <div
      className={cn("relative w-full")}
    >
      <form className={cn("w-full")} onSubmit={handleSubmit}>
        {editorCard}
      </form>
    </div>
  );
};
