"use client";

import React, { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { CirclePlus, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import { t } from "@/app/i18n/translations";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
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
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { ActionMenu } from "@/app/receipt/components/ui/ActionMenu";
import { IconActionGroup } from "@/app/receipt/components/ui/IconActionGroup";
import { SplittingHeroEditor } from "./SplittingHeroEditor";
import { prioritizeCurrentUserParticipant } from "./prioritizeCurrentUserParticipant";
import {
  getFormPathErrorMessage,
  hasFormPathError,
} from "@/app/receipt/utils/hasFormPathError";
import { getClaimAmount, getClaimOverage } from "@/app/receipt/utils/claims";
import { formatMoney, formatMoneyValue } from "@/app/receipt/utils/formatMoney";
import {
  iconLeadSpacingVariants,
  iconSizeVariants,
  inlineGapVariants,
  pillVariants,
  radiusTokens,
  rowContentPaddingVariants,
  rowVariants,
  sheetShell,
  stackGapVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";

// ── Splitting-scoped styles ──────────────────────

const claimsListPadding = "px-3 py-2";
const claimsErrorRing = "ring-2 ring-destructive/30 rounded-xl";
const splittingHeader = `border-b border-border/40 bg-background/80 backdrop-blur-sm ${claimsListPadding}`;
const splittingFooter = "border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 pt-3 pb-4";
const avatarRing = "ring-2 ring-background";
const avatarFallback = "bg-muted/50 border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground";
const avatarOverflow = "bg-muted/70 border border-border flex items-center justify-center text-[10px] font-medium text-muted-foreground";

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
      shadow="md"
      radius="xl"
      className="overflow-hidden"
    >
      <div
        className={cn(
          rowVariants({ align: "center", width: "full" }),
          inlineGapVariants({ size: "sm" }),
          rowContentPaddingVariants({ density: "regular" }),
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "min-w-0 flex-1 text-left",
            rowVariants({ align: "center", justify: "between", width: "full" }),
            inlineGapVariants({ size: "sm" }),
          )}
        >
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                rowVariants({ align: "baseline" }),
                inlineGapVariants({ size: "sm" }),
              )}
            >
              <span className={textVariants({ weight: "semibold" })}>
                {claim.type === "amount"
                  ? formatMoneyValue(claim.value)
                  : formatClaimValue(claim.value)}
              </span>
              <span className={textVariants({ size: "sm", tone: "muted" })}>
                {claim.type === "amount" ? "₽" : t("pcs")}
              </span>
              {claim.type === "quantity" && (
                <span className={textVariants({ size: "sm", tone: "muted" })}>
                  = {formatMoneyValue(amount)} ₽
                </span>
              )}
            </div>
          </div>

          <div className="flex -space-x-2">
            {selectedParticipants.length > 0 ? (
              selectedParticipants.slice(0, 4).map((participant, index) => (
                <div
                  key={participant.id}
                  className={cn(
                    "relative",
                    avatarRing,
                    radiusTokens.full,
                  )}
                  style={{ zIndex: selectedParticipants.length - index }}
                >
                  <ParticipantAvatar participant={participant} className="h-7 w-7" />
                </div>
              ))
            ) : (
              <div
                className={cn(
                  "h-7 w-7",
                  avatarFallback,
                  radiusTokens.full,
                )}
              >
                ?
              </div>
            )}
            {selectedParticipants.length > 4 && (
              <div
                className={cn(
                  "h-7 w-7",
                  avatarOverflow,
                  radiusTokens.full,
                )}
              >
                +{selectedParticipants.length - 4}
              </div>
            )}
          </div>
        </button>

        <ActionMenu
          triggerLabel={t("edit")}
          triggerIcon={<MoreVertical className={iconSizeVariants({ size: "sm" })} />}
          items={[
            ...(!active
              ? [
                {
                  id: "edit",
                  label: t("edit"),
                  onSelect: onEdit,
                  icon: (
                    <Pencil
                      className={cn(
                        iconLeadSpacingVariants(),
                        iconSizeVariants({ size: "sm" }),
                      )}
                    />
                  ),
                },
              ]
              : []),
            {
              id: "delete",
              label: t("delete"),
              tone: "danger" as const,
              onSelect: onDelete,
              icon: (
                <Trash2
                  className={cn(
                    iconLeadSpacingVariants(),
                    iconSizeVariants({ size: "sm" }),
                  )}
                />
              ),
            },
          ]}
        />
      </div>
      <DistributionBar data={claim} className="h-1" />
    </ReceiptCard>
  );
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
  const orderedParticipants = useMemo(
    () => prioritizeCurrentUserParticipant(participants, user?.id),
    [participants, user?.id],
  );

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
    participants: orderedParticipants,
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
  const allParticipantsSelected =
    !!draftClaim &&
    orderedParticipants.length > 0 &&
    draftClaim.participantIds.length === orderedParticipants.length;

  const displayedClaims = localPosition.claims.map((claim) => {
    if (activeDraftId === claim.id && draftClaim) {
      return draftClaim;
    }

    return claim;
  });

  return (
    <DrawerContent className={sheetShell}>
      <DrawerHeader>
        <DrawerTitle>{localPosition.name}</DrawerTitle>
      </DrawerHeader>
      <div className={cn(splittingHeader)}>
        {(draftClaim && (
          <SplittingHeroEditor
            claim={draftClaim}
            claims={localPosition.claims}
            price={localPosition.price}
            overall={localPosition.overall}
            participants={orderedParticipants}
            saveDisabled={saveDisabled}
            allParticipantsSelected={allParticipantsSelected}
            onUpdate={updateDraft}
            onCancel={cancelDraft}
            onSave={() => {
              void saveDraft();
            }}
          />
        )) || (
          <div className="flex justify-between items-center">
            <div>
              {localPosition.quantity} {t("pcs")} × {formatMoney(localPosition.price)} ={" "}
              <span className={textVariants({ weight: "semibold" })}>
                {formatMoney(localPosition.overall)}
              </span>
            </div>
            <IconActionGroup
              size="compact"
              className="justify-self-end"
              actions={[
                {
                  id: "add-share",
                  label: t("addShare"),
                  onClick: () => startAdding(),
                  icon: (
                    <CirclePlus className={iconSizeVariants({ size: "sm" })} />
                  ),
                },
                {
                  id: "edit-position",
                  label: t("edit"),
                  onClick: () =>
                    openEditModal({
                      type: "position",
                      index: positionIndex,
                      view: "editing",
                    }),
                  icon: <Pencil className={iconSizeVariants({ size: "sm" })} />,
                },
              ]}
            />
          </div>
        )}
        {hasClaimsError && claimsErrorMessage && (
          <div
            className={cn(
              'mt-2',
              textVariants({ align: 'center' }),
              pillVariants({ tone: "danger", radius: "full" }),
            )}
          >
            {claimsErrorMessage}
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          stackGapVariants({ size: "sm" }),
          claimsListPadding,
          hasClaimsError && claimsErrorRing,
        )}
      >
        {displayedClaims.map((claim) => (
          <ClaimRow
            key={claim.id}
            claim={claim}
            price={localPosition.price}
            participants={orderedParticipants}
            active={activeDraftId === claim.id}
            onSelect={() => startEditing(claim)}
            onEdit={() => startEditing(claim)}
            onDelete={() => deleteClaim(claim)}
          />
        ))}
      </div>
      <DrawerFooter className={splittingFooter}>
        <div className="pb-1">
          <div
            className={cn(
              "mb-2",
              rowVariants({ justify: "between", width: "full" }),
              textVariants({ size: "sm", weight: "medium" }),
            )}
          >
            <span className={textVariants({ size: "sm", tone: "muted" })}>
              {t("distributed")}
            </span>
            <span className="font-medium">
              {formatMoneyValue(totalClaimed)} / {formatMoney(localPosition.overall)}
            </span>
          </div>
          <DistributionBar data={effectivePosition} className="h-3" />
        </div>

        <DrawerClose asChild>
          <Button
            className="w-full"
            onClick={handleDone}
            disabled={
              totalClaimed > localPosition.overall + 0.01 ||
              activeDraftId !== null
            }
          >
            {t("done")}
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
};
