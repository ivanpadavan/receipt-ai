"use client";

import React, { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import { t } from "@/app/i18n/translations";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { useReceiptState } from "../ReceiptForm";
import {
  ParticipantDTO,
  ReceiptPosition,
  ReceiptPositionClaim,
} from "@/model/receipt/model";
import { useUser } from "@/context/AuthContext";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { useSplittingLogic } from "./useSplittingLogic";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { DistributionBar } from "@/app/receipt/components/ui/DistributionBar";
import { DistributionStatus } from "@/app/receipt/components/ui/DistributionStatus";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import {
  getFormPathErrorMessage,
  hasFormPathError,
} from "@/app/receipt/utils/hasFormPathError";
import { getClaimAmount, getClaimOverage } from "@/app/receipt/utils/claims";
import {
  avatarSizeVariants,
  iconButtonVariants,
  iconSizeVariants,
  iconSoloVariants,
  inlineGapVariants,
  radiusTokens,
  rowVariants,
  sheetHeaderTitleVariants,
  splittingAddShareButtonVariants,
  splittingAddSharePaddingVariants,
  splittingAvatarFallbackVariants,
  splittingAvatarOverflowVariants,
  splittingAvatarRingVariants,
  splittingClaimsErrorRingVariants,
  splittingClaimsListPaddingVariants,
  splittingFooterContentPaddingVariants,
  splittingFooterVariants,
  splittingParticipantButtonVariants,
  splittingSheetSubtitleVariants,
  splittingTypeSwitchButtonVariants,
  splittingTypeSwitchWrapperVariants,
  stackGapVariants,
  statusPillVariants,
  textRoleVariants,
} from "@/app/receipt/components/ui-styles";

interface ParticipantsSelectorProps {
  selectedIds: string[];
  participants: ParticipantDTO[];
  onChange: (ids: string[]) => void;
}

const ParticipantsSelector: React.FC<ParticipantsSelectorProps> = ({
  selectedIds,
  participants,
  onChange,
}) => {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((participantId) => participantId !== id));
      return;
    }

    onChange([...selectedIds, id]);
  };

  return (
    <div className={cn(rowVariants({ wrap: true }), inlineGapVariants({ size: "sm" }))}>
      {participants.map((participant) => {
        const selected = selectedIds.includes(participant.id);

        return (
          <button
            key={participant.id}
            type="button"
            className={splittingParticipantButtonVariants({ selected })}
            onClick={() => handleToggle(participant.id)}
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
  );
};

interface ClaimRowProps {
  claim: ReceiptPositionClaim;
  price: number;
  participants: ParticipantDTO[];
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const formatClaimValue = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toFixed(0);
  }

  return value.toFixed(2).replace(/\.0+$/, "").replace(/(\.[1-9]*)0+$/, "$1");
};

const ClaimRow: React.FC<ClaimRowProps> = ({
  claim,
  price,
  participants,
  active,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const amount = getClaimAmount(claim, price);
  const selectedParticipants = participants.filter((participant) =>
    claim.participantIds.includes(participant.id),
  );

  return (
    <ReceiptCard
      interactive
      state={active ? "active" : "default"}
      shadow="sm"
      radius="2xl"
      className="overflow-hidden"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          rowVariants({ align: "center", width: "full" }),
          inlineGapVariants({ size: "sm" }),
          "px-3 py-2 text-left",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className={cn(rowVariants({ align: "baseline" }), inlineGapVariants({ size: "sm" }))}>
            <span className={textRoleVariants({ role: "amountSemibold" })}>
              {formatClaimValue(claim.value)}
            </span>
            <span className={textRoleVariants({ role: "labelSmMuted" })}>
              {claim.type === "amount" ? "₽" : t("pcs")}
            </span>
            {claim.type === "quantity" && (
              <span className={textRoleVariants({ role: "labelSmMuted" })}>
                = {formatClaimValue(amount)} ₽
              </span>
            )}
          </div>
        </div>

        <div className="flex -space-x-2">
          {selectedParticipants.length > 0 ? (
            selectedParticipants.slice(0, 4).map((participant, index) => (
              <div
                key={participant.id}
                className={cn("relative", splittingAvatarRingVariants(), radiusTokens.full)}
                style={{ zIndex: selectedParticipants.length - index }}
              >
                <ParticipantAvatar participant={participant} className="h-7 w-7" />
              </div>
            ))
          ) : (
            <div className={cn("h-7 w-7", splittingAvatarFallbackVariants(), radiusTokens.full)}>
              ?
            </div>
          )}
          {selectedParticipants.length > 4 && (
            <div className={cn("h-7 w-7", splittingAvatarOverflowVariants(), radiusTokens.full)}>
              +{selectedParticipants.length - 4}
            </div>
          )}
        </div>

        <div className={cn(rowVariants({ align: "center" }), inlineGapVariants({ size: "xs" }))}>
          {!active && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconSoloVariants({ size: "compact" }), iconButtonVariants({ size: "compact", tone: "muted" }))}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              aria-label={t("edit")}
            >
              <Pencil className={iconSizeVariants({ size: "sm" })} />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(iconSoloVariants({ size: "compact" }), iconButtonVariants({ size: "compact", tone: "neutral" }))}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label={t("delete")}
          >
            <Trash2 className={iconSizeVariants({ size: "sm" })} />
          </Button>
        </div>
      </div>
      <DistributionBar data={claim} className="h-1" />
    </ReceiptCard>
  );
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

export const SplittingSheet: React.FC<EditModalProps> = ({
  onSave,
  fieldPath,
}) => {
  const {
    scenario: { form },
    openEditModal,
  } = useReceiptState();
  const { errors } = form.formState;

  const participants = useParticipantsStore((store) => store.participants);
  const { user } = useUser();

  const claimsPath = `${fieldPath}.claims`;
  const hasClaimsError = hasFormPathError(errors, claimsPath);
  const claimsErrorMessage = getFormPathErrorMessage(errors, claimsPath);
  const positionIndex = Number(fieldPath?.match(/^positions\.(\d+)$/)?.[1] ?? -1);

  const {
    localPosition,
    effectivePosition,
    totalClaimed,
    activeDraftId,
    draftClaim,
    startAdding,
    startEditing,
    updateDraft,
    cancelDraft,
    saveDraft,
    deleteClaim,
    handleDone,
  } = useSplittingLogic({
    initialValue: useWatch({
      control: form.control,
      name: fieldPath!,
    }) as ReceiptPosition,
    onSave,
    currentUser: user,
    participants,
  });

  const draftOverage = useMemo(() => {
    if (!activeDraftId || !draftClaim) {
      return 0;
    }

    return getClaimOverage(
      draftClaim,
      localPosition.claims,
      localPosition.price,
      localPosition.overall,
      activeDraftId === "new" ? undefined : activeDraftId,
    );
  }, [activeDraftId, draftClaim, localPosition]);

  const saveDisabled = !draftClaim || draftClaim.value <= 0 || draftOverage > 0;

  const allParticipantIds = participants.map((participant) => participant.id);
  const allParticipantsSelected =
    !!draftClaim &&
    participants.length > 0 &&
    draftClaim.participantIds.length === participants.length;

  const displayedClaims = localPosition.claims.map((claim) => {
    if (activeDraftId === claim.id && draftClaim) {
      return draftClaim;
    }

    return claim;
  });

  return (
    <DrawerContent className="h-[85vh] flex flex-col">
      <DrawerTitle
        className={cn(
          sheetHeaderTitleVariants(),
          textRoleVariants({ role: "sectionTitleCenter" }),
        )}
      >
        {localPosition.name}
      </DrawerTitle>

      <div
        className={cn(
          "flex flex-col items-center",
          inlineGapVariants({ size: "xs" }),
          splittingSheetSubtitleVariants(),
          textRoleVariants({ role: "labelSmMutedCenter" }),
        )}
      >
        <div>
          {localPosition.quantity} {t("pcs")} × {localPosition.price} ₽ ={" "}
          <span className={textRoleVariants({ role: "amountSemibold" })}>
            {localPosition.overall} ₽
          </span>
        </div>

        <DistributionStatus distributed={totalClaimed} total={localPosition.overall} />
        {hasClaimsError && claimsErrorMessage && (
          <div className={statusPillVariants({ tone: "danger", radius: "full" })}>
            {claimsErrorMessage}
          </div>
        )}
      </div>

      <div className={splittingAddSharePaddingVariants()}>
        <div className={cn(rowVariants({ align: "center", width: "full" }), inlineGapVariants({ size: "sm" }))}>
          <Button
            type="button"
            variant="ghost"
            className={cn("flex-1", splittingAddShareButtonVariants())}
            onClick={startAdding}
          >
            + {t("addShare")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              iconSoloVariants({ size: "compact" }),
              iconButtonVariants({ size: "compact", tone: "muted" }),
            )}
            onClick={() =>
              openEditModal({
                type: "position",
                index: positionIndex,
                view: "editing",
              })
            }
            aria-label={t("edit")}
            title={t("edit")}
          >
            <Pencil className={iconSizeVariants({ size: "sm" })} />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto",
          stackGapVariants({ size: "sm" }),
          splittingClaimsListPaddingVariants(),
          hasClaimsError && splittingClaimsErrorRingVariants(),
        )}
      >
        {activeDraftId && draftClaim && (
          <ReceiptCard tone="warm" shadow="sm" radius="2xl" className="overflow-hidden border-amber-200/70">
            <div className="px-3 pt-3 pb-2">
              <div className={rowVariants({ justify: "between", align: "start", width: "full" })}>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-16 min-w-0 flex-1 border-0 bg-transparent px-0 text-center text-5xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
                  value={draftClaim.value > 0 ? formatClaimValue(draftClaim.value) : ""}
                  onChange={(event) =>
                    updateDraft({
                      ...draftClaim,
                      value: parseInputValue(event.target.value),
                    })
                  }
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !saveDisabled) {
                      void saveDraft();
                    }
                    if (event.key === "Escape") {
                      cancelDraft();
                    }
                  }}
                />

                <div className={cn("flex items-center", splittingTypeSwitchWrapperVariants(), radiusTokens.full)}>
                  <button
                    type="button"
                    className={cn(
                      splittingTypeSwitchButtonVariants({
                        active: draftClaim.type === "quantity",
                      }),
                      radiusTokens.full,
                    )}
                    aria-pressed={draftClaim.type === "quantity"}
                    onClick={() => updateDraft({ ...draftClaim, type: "quantity" })}
                  >
                    ШТ
                  </button>
                  <button
                    type="button"
                    className={cn(
                      splittingTypeSwitchButtonVariants({
                        active: draftClaim.type === "amount",
                      }),
                      radiusTokens.full,
                    )}
                    aria-pressed={draftClaim.type === "amount"}
                    onClick={() => updateDraft({ ...draftClaim, type: "amount" })}
                  >
                    ₽
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 px-3 py-3">
              <div className={cn(rowVariants({ justify: "between", width: "full" }), "mb-2")}>
                <span className={textRoleVariants({ role: "overlineMuted" })}>
                  {t("splitBetween")}
                </span>
                <button
                  type="button"
                  className={cn(textRoleVariants({ role: "metaSmBrandStrong" }))}
                  disabled={participants.length === 0}
                  onClick={() =>
                    updateDraft({
                      ...draftClaim,
                      participantIds: allParticipantsSelected ? [] : allParticipantIds,
                    })
                  }
                >
                  {allParticipantsSelected ? t("clearAll") : t("selectAll")}
                </button>
              </div>

              <ParticipantsSelector
                selectedIds={draftClaim.participantIds}
                participants={participants}
                onChange={(participantIds) => updateDraft({ ...draftClaim, participantIds })}
              />

              <div className={cn(rowVariants({ width: "full" }), inlineGapVariants({ size: "sm" }), "mt-3")}>
                <Button type="button" variant="outline" className="flex-1" onClick={cancelDraft}>
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    void saveDraft();
                  }}
                  disabled={saveDisabled}
                >
                  {t("save")}
                </Button>
              </div>
            </div>
          </ReceiptCard>
        )}

        {displayedClaims.length === 0 && (
          <ReceiptCard tone="soft" shadow="none" radius="2xl">
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t("noClaims")}
            </div>
          </ReceiptCard>
        )}

        {displayedClaims.map((claim) => (
          <ClaimRow
            key={claim.id}
            claim={claim}
            price={localPosition.price}
            participants={participants}
            active={activeDraftId === claim.id}
            onSelect={() => startEditing(claim)}
            onEdit={() => startEditing(claim)}
            onDelete={() => deleteClaim(claim)}
          />
        ))}
      </div>

      <DrawerFooter className={splittingFooterVariants()}>
        <div className={splittingFooterContentPaddingVariants()}>
          <div className={cn("mb-2", rowVariants({ justify: "between", width: "full" }), textRoleVariants({ role: "labelSm" }))}>
            <span className={textRoleVariants({ role: "labelSmMuted" })}>{t("distributed")}</span>
            <span className="font-medium">
              {totalClaimed.toFixed(0)} / {localPosition.overall} ₽
            </span>
          </div>
          <DistributionBar data={effectivePosition} className="h-3" />
        </div>

        <DrawerClose asChild>
          <Button
            className="mx-4 mb-4"
            onClick={handleDone}
            disabled={
              totalClaimed > localPosition.overall + 0.01 || activeDraftId !== null
            }
          >
            {t("done")}
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
};
