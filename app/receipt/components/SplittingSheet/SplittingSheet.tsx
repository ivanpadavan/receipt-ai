"use client";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import React from "react";
import { t } from "@/app/i18n/translations";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useReceiptState } from "../ReceiptForm";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/utils/cn";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { DistributionBar } from "@/app/receipt/components/ui/DistributionBar";
import { DistributionStatus } from "@/app/receipt/components/ui/DistributionStatus";
import { ConfirmCancelGroup } from "@/app/receipt/components/ui/ConfirmCancelGroup";
import {
  ParticipantDTO,
  ReceiptPosition,
  ReceiptPositionClaim,
} from "@/model/receipt/model";
import { getClaimOverage } from "@/app/receipt/utils/claims";
import { useWatch } from "react-hook-form";
import { useUser } from "@/context/AuthContext";
import { useSplittingLogic } from "./useSplittingLogic";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { getFormPathErrorMessage, hasFormPathError } from "@/app/receipt/utils/hasFormPathError";
import {
  iconButtonVariants,
  iconSoloVariants,
  radiusTokens,
  splittingAccordionContentPaddingVariants,
  splittingAccordionContentVariants,
  splittingAccordionTriggerPaddingVariants,
  splittingAddShareButtonVariants,
  splittingAddSharePaddingVariants,
  splittingAvatarFallbackVariants,
  splittingAvatarOverflowVariants,
  splittingAvatarRingVariants,
  splittingClaimHeaderVariants,
  splittingClaimInfoVariants,
  splittingClaimsErrorRingVariants,
  splittingEditingHeaderVariants,
  splittingEditingInputVariants,
  splittingFooterContentPaddingVariants,
  splittingFooterVariants,
  splittingHeaderActionPaddingVariants,
  splittingMenuButtonVariants,
  splittingMenuDangerItemVariants,
  splittingParticipantButtonVariants,
  splittingSheetSubtitleVariants,
  splittingTypeSwitchButtonVariants,
  splittingTypeSwitchWrapperVariants,
  splittingClaimsListPaddingVariants,
  sheetTitlePaddingVariants,
  avatarSizeVariants,
  iconButtonCompactVariants,
  iconSizeVariants,
  iconLeadSpacingVariants,
  inlineGapVariants,
  stackGapVariants,
  rowVariants,
  statusPillVariants,
  textRoleVariants,
} from "@/app/receipt/components/ui-styles";

// --- Components ---

interface EditingHeaderProps {
  claim: ReceiptPositionClaim;
  isInvalid?: boolean;
  onUpdate: (claim: ReceiptPositionClaim) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditingHeader: React.FC<EditingHeaderProps> = ({
  claim,
  isInvalid,
  onUpdate,
  onSave,
  onCancel,
}) => {
  return (
    <div
      className={cn(
        rowVariants({ align: "center", width: "full" }),
        inlineGapVariants({ size: "sm" }),
        splittingEditingHeaderVariants(),
      )}
    >
      {/* Input Value */}
      <Input
        type="number"
        className={cn(
          "flex-1 h-9",
          splittingEditingInputVariants(),
          isInvalid && "border-destructive focus-visible:ring-destructive",
        )}
        value={claim.value || ""}
        onChange={(e) =>
          onUpdate({ ...claim, value: parseFloat(e.target.value) || 0 })
        }
        placeholder="0"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && claim.value > 0 && !isInvalid) {
            onSave();
          }
        }}
      />

      {/* Type Switch */}
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
            splittingTypeSwitchButtonVariants({ active: claim.type === "amount" }),
            radiusTokens.full,
          )}
          aria-pressed={claim.type === "amount"}
          onClick={() => onUpdate({ ...claim, type: "amount" })}
        >
          ₽
        </button>
      </div>
      <ConfirmCancelGroup
        onCancel={onCancel}
        onConfirm={onSave}
        confirmDisabled={claim.value <= 0 || isInvalid}
      />
    </div>
  );
};

interface ViewingHeaderProps {
  claim: ReceiptPositionClaim;
  price: number;
  participants: ParticipantDTO[];
  onEditStart: () => void;
  onRemove: () => void;
}

const ViewingHeader: React.FC<ViewingHeaderProps> = ({
  claim,
  price,
  participants,
  onEditStart,
  onRemove,
}) => {
  const amount = claim.type === "quantity" ? claim.value * price : claim.value;
  const selectedParticipants = participants.filter((p) =>
    claim.participantIds.includes(p.id),
  );

  return (
    <>
      <AccordionTrigger
        className={cn(
          "flex-1 hover:no-underline",
          splittingAccordionTriggerPaddingVariants(),
        )}
      >
        <div className={rowVariants({ align: "center", justify: "between", width: "full" })}>
          {/* Claim info - left side */}
          <div
            className={cn(
              rowVariants({ align: "baseline" }),
              inlineGapVariants({ size: "sm" }),
              splittingClaimInfoVariants(),
            )}
          >
            <span className={textRoleVariants({ role: "amountSemibold" })}>
              {claim.value}
            </span>
            <span className={textRoleVariants({ role: "labelSmMuted" })}>
              {claim.type === "amount" ? "₽" : t("pcs")}
            </span>
            {claim.type !== "amount" && (
              <span className={textRoleVariants({ role: "labelSmMuted" })}>
                = {amount.toFixed(0)} ₽
              </span>
            )}
          </div>

          {/* Stacked avatars */}
          <div className="flex -space-x-2 mr-2">
            {selectedParticipants.length > 0 ? (
              selectedParticipants.slice(0, 4).map((p, idx) => (
                <div
                  key={p.id}
                  className={cn(
                    "relative",
                    splittingAvatarRingVariants(),
                    radiusTokens.full,
                  )}
                  style={{ zIndex: selectedParticipants.length - idx }}
                >
                  <ParticipantAvatar participant={p} className="h-7 w-7" />
                </div>
              ))
            ) : (
              <div
                className={cn(
                  "w-7 h-7",
                  splittingAvatarFallbackVariants(),
                  radiusTokens.full,
                )}
              >
                ?
              </div>
            )}
            {selectedParticipants.length > 4 && (
              <div
                className={cn(
                  "w-7 h-7",
                  splittingAvatarOverflowVariants(),
                  radiusTokens.full,
                )}
              >
                +{selectedParticipants.length - 4}
              </div>
            )}
          </div>
        </div>
      </AccordionTrigger>

      {/* Actions - outside trigger */}
      <div
        className={cn(
          rowVariants({ align: "center" }),
          splittingHeaderActionPaddingVariants(),
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                iconButtonCompactVariants(),
                splittingMenuButtonVariants(),
              )}
            >
              <MoreVertical className={iconSizeVariants({ size: "sm" })} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditStart}>
              <Pencil
                className={cn(
                  iconLeadSpacingVariants(),
                  iconSizeVariants({ size: "sm" }),
                )}
              />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRemove}
              className={splittingMenuDangerItemVariants()}
            >
              <Trash2
                className={cn(
                  iconLeadSpacingVariants(),
                  iconSizeVariants({ size: "sm" }),
                )}
              />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

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
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={cn("flex flex-wrap", inlineGapVariants({ size: "sm" }))}>
      {participants.map((p) => {
        const isSelected = selectedIds.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => handleToggle(p.id)}
            className={cn(
              splittingParticipantButtonVariants({ selected: isSelected }),
            )}
          >
            <ParticipantAvatar
              participant={p}
              className={avatarSizeVariants({ size: "sm" })}
              showRing={isSelected}
            />
          </button>
        );
      })}
    </div>
  );
};

// --- ClaimRow ---

interface ClaimRowProps {
  claim: ReceiptPositionClaim;
  participants: ParticipantDTO[];
  onUpdate: (claim: ReceiptPositionClaim) => void;
  header: React.ReactNode;
  defaultOpen?: boolean;
}

const ClaimRow: React.FC<ClaimRowProps> = ({
  claim,
  participants,
  onUpdate,
  header,
  defaultOpen,
}) => {
  return (
    <ReceiptCard
      interactive
      shadow="md"
      radius="2xl"
      className="overflow-hidden"
    >
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpen ? "1" : undefined}
      >
        <AccordionItem value="1">
          <AccordionHeader
            className={cn(
              "flex items-stretch h-[4rem]",
              splittingClaimHeaderVariants(),
            )}
          >
            {header}
          </AccordionHeader>

          <AccordionContent className={splittingAccordionContentPaddingVariants()}>
            <div className={splittingAccordionContentVariants()}>
              <ParticipantsSelector
                selectedIds={claim.participantIds}
                participants={participants}
                onChange={(ids) => onUpdate({ ...claim, participantIds: ids })}
              />
            </div>
          </AccordionContent>

          <DistributionBar data={claim} className="h-1" />
        </AccordionItem>
      </Accordion>
    </ReceiptCard>
  );
};

// --- Main Sheet Component ---

export const SplittingSheet: React.FC<EditModalProps> = ({
  onSave,
  fieldPath,
}) => {
  const {
    scenario: { form },
    openEditModal,
  } = useReceiptState();
  const { errors } = form.formState;
  const participants = useParticipantsStore((s) => s.participants);
  const { user } = useUser();
  const claimsPath = `${fieldPath}.claims`;
  const hasClaimsError = hasFormPathError(errors, claimsPath);
  const claimsErrorMessage = getFormPathErrorMessage(errors, claimsPath);
  const positionIndex = Number(fieldPath?.match(/^positions\.(\d+)$/)?.[1] ?? -1);

  const {
    localPosition,
    draftClaims,
    effectivePosition,
    totalClaimed,
    newDraftClaim,
    startAdding,
    updateDraft,
    handleSaveDraft,
    removeDraft,
    handleDeleteClaim,
    handleEditClick,
    handleUpdateClaim,
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

  return (
    <DrawerContent className="h-[85vh] flex flex-col">
      <DrawerTitle
        className={cn(
          sheetTitlePaddingVariants(),
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

        <DistributionStatus
          distributed={totalClaimed}
          total={localPosition.overall}
        />
        {hasClaimsError && claimsErrorMessage && (
          <div
            className={cn(
              statusPillVariants({ tone: "danger", radius: "full" }),
            )}
          >
            {claimsErrorMessage}
          </div>
        )}
      </div>

      {!newDraftClaim && (
        <div className={splittingAddSharePaddingVariants()}>
          <Button
            variant="ghost"
            className={cn("w-full", splittingAddShareButtonVariants())}
            onClick={startAdding}
          >
            + {t("addShare")}
          </Button>
        </div>
      )}

      {/* Scrollable shares area */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          stackGapVariants({ size: "md" }),
          splittingClaimsListPaddingVariants(),
          hasClaimsError && splittingClaimsErrorRingVariants(),
        )}
      >
        {/* Add View (only if adding new) */}
        {newDraftClaim && (
          <ClaimRow
            key="new-claim"
            claim={newDraftClaim}
            participants={participants}
            onUpdate={(c) => updateDraft("new", c)}
            defaultOpen={true}
            header={
              <EditingHeader
                claim={newDraftClaim}
                isInvalid={
                  getClaimOverage(
                    newDraftClaim,
                    localPosition.claims,
                    localPosition.price,
                    localPosition.overall,
                  ) > 0
                }
                onUpdate={(c) => updateDraft("new", c)}
                onSave={() => handleSaveDraft("new")}
                onCancel={() => removeDraft("new")}
              />
            }
          />
        )}

        {/* Claims List */}
        {localPosition.claims.map((claim) => {
          const isEditing = draftClaims.has(claim.id);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const currentClaim = isEditing ? draftClaims.get(claim.id)! : claim;

          return (
            <ClaimRow
              key={claim.id}
              claim={currentClaim}
              participants={participants}
              onUpdate={(c) =>
                isEditing ? updateDraft(claim.id, c) : handleUpdateClaim(c)
              }
              header={
                isEditing ? (
                  <EditingHeader
                    claim={currentClaim}
                    isInvalid={
                      getClaimOverage(
                        currentClaim,
                        localPosition.claims,
                        localPosition.price,
                        localPosition.overall,
                        currentClaim.id,
                      ) > 0
                    }
                    onUpdate={(c) => updateDraft(claim.id, c)}
                    onSave={() => handleSaveDraft(claim.id)}
                    onCancel={() => removeDraft(claim.id)}
                  />
                ) : (
                  <ViewingHeader
                    claim={currentClaim}
                    price={localPosition.price}
                    participants={participants}
                    onEditStart={() => handleEditClick(claim)}
                    onRemove={() => handleDeleteClaim(claim)}
                  />
                )
              }
            />
          );
        })}
      </div>

      {/* Footer - Distribution + Done button */}

      <DrawerFooter className={splittingFooterVariants()}>
        <div className={splittingFooterContentPaddingVariants()}>
          <div
            className={cn(
              "flex justify-between mb-2",
              textRoleVariants({ role: "labelSm" }),
            )}
          >
            <span className={textRoleVariants({ role: "labelSmMuted" })}>
              {t("distributed")}
            </span>
            <span className="font-medium">
              {totalClaimed.toFixed(0)} / {localPosition.overall} ₽
            </span>
          </div>
          <DistributionBar
            data={effectivePosition}
            className="h-3"
          />
        </div>
        <div className={cn("flex", inlineGapVariants({ size: "sm" }))}>
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
          <DrawerClose asChild>
            <Button
              className="grow"
              onClick={handleDone}
              disabled={totalClaimed > localPosition.overall + 0.01}
            >
              {t("done")}
            </Button>
          </DrawerClose>
        </div>
      </DrawerFooter>
    </DrawerContent>
  );
};
