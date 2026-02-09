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
import { iconButtonVariants, iconSoloVariants, pillVariants } from "@/app/receipt/components/ui-styles";
import { cva } from "class-variance-authority";

// --- Components ---

interface EditingHeaderProps {
  claim: ReceiptPositionClaim;
  isInvalid?: boolean;
  onUpdate: (claim: ReceiptPositionClaim) => void;
  onSave: () => void;
  onCancel: () => void;
}

const editingHeaderVariants = cva("border-b bg-muted/20");

const editingInputVariants = cva("h-9 bg-background");

const typeSwitchWrapperVariants = cva(
  "rounded-full border border-border/60 bg-muted/30 p-1 shadow-sm",
);

const typeSwitchButtonVariants = cva(
  "h-8 w-16 rounded-full text-xs font-semibold transition",
  {
    variants: {
      active: {
        true: "bg-white text-foreground shadow",
        false: "text-muted-foreground",
      },
    },
  },
);

const menuButtonVariants = cva("h-8 w-8 text-gray-500");

const menuDangerItemVariants = cva(
  "text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50",
);

const avatarRingVariants = cva("ring-2 ring-background rounded-full");

const avatarFallbackVariants = cva(
  "rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground",
);

const avatarOverflowVariants = cva(
  "rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-muted-foreground/30",
);

const claimHeaderVariants = cva(
  "hover:bg-muted/30 transition-colors bg-background",
);

const addShareButtonVariants = cva("rounded-full border");

const claimsErrorRingVariants = cva("ring-1 ring-destructive/40 rounded-xl");

const claimInfoVariants = cva("text-foreground");
const claimMetaVariants = cva("text-sm text-muted-foreground");
const participantButtonVariants = cva("relative rounded-full transition-all", {
  variants: {
    selected: {
      true: "",
      false: "opacity-50 hover:opacity-80",
    },
  },
  defaultVariants: {
    selected: true,
  },
});

const accordionContentVariants = cva("border-t bg-background");

const sheetTitleVariants = cva("text-center");
const sheetSubtitleVariants = cva("text-sm text-muted-foreground");
const footerVariants = cva("border-t bg-background");
const footerLabelVariants = cva("text-muted-foreground");
const sheetOverallValueVariants = cva("font-semibold text-foreground");

const EditingHeader: React.FC<EditingHeaderProps> = ({
  claim,
  isInvalid,
  onUpdate,
  onSave,
  onCancel,
}) => {
  return (
    <div className={cn("flex items-center gap-2 p-3 w-full", editingHeaderVariants())}>
      {/* Input Value */}
      <Input
        type="number"
        className={cn(
          "flex-1",
          editingInputVariants(),
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
      <div className={cn("flex items-center", typeSwitchWrapperVariants())}>
        <button
          type="button"
          className={cn(
            typeSwitchButtonVariants({
              active: claim.type === "quantity",
            }),
          )}
          aria-pressed={claim.type === "quantity"}
          onClick={() => onUpdate({ ...claim, type: "quantity" })}
        >
          ШТ
        </button>
        <button
          type="button"
          className={cn(
            typeSwitchButtonVariants({ active: claim.type === "amount" }),
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
      <AccordionTrigger className="flex-1 px-3 py-3 hover:no-underline">
        <div className="flex justify-between items-center w-full">
          {/* Claim info - left side */}
          <div className={cn("flex items-baseline gap-2", claimInfoVariants())}>
            <span className="font-semibold">{claim.value}</span>
            <span className={claimMetaVariants()}>
              {claim.type === "amount" ? "₽" : t("pcs")}
            </span>
            {claim.type !== "amount" && (
              <span className={claimMetaVariants()}>
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
                  className={cn("relative", avatarRingVariants())}
                  style={{ zIndex: selectedParticipants.length - idx }}
                >
                  <ParticipantAvatar participant={p} className="h-7 w-7" />
                </div>
              ))
            ) : (
              <div className={cn("w-7 h-7", avatarFallbackVariants())}>
                ?
              </div>
            )}
            {selectedParticipants.length > 4 && (
              <div className={cn("w-7 h-7", avatarOverflowVariants())}>
                +{selectedParticipants.length - 4}
              </div>
            )}
          </div>
        </div>
      </AccordionTrigger>

      {/* Actions - outside trigger */}
      <div className="flex items-center px-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={menuButtonVariants()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditStart}>
              <Pencil className="h-4 w-4 mr-2" />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRemove}
              className={menuDangerItemVariants()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
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
    <div className="flex flex-wrap gap-2">
      {participants.map((p) => {
        const isSelected = selectedIds.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => handleToggle(p.id)}
            className={cn(
              participantButtonVariants({ selected: isSelected }),
            )}
          >
            <ParticipantAvatar
              participant={p}
              className="h-8 w-8"
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
            className={cn("flex items-stretch h-[4rem]", claimHeaderVariants())}
          >
            {header}
          </AccordionHeader>

          <AccordionContent className="p-0">
            <div className={cn("px-3 py-2", accordionContentVariants())}>
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
      <DrawerTitle className={cn("px-4 pt-4", sheetTitleVariants())}>
        {localPosition.name}
      </DrawerTitle>

      <div
        className={cn(
          "px-4 py-2 text-center flex flex-col items-center gap-1",
          sheetSubtitleVariants(),
        )}
      >
        <div>
          {localPosition.quantity} {t("pcs")} × {localPosition.price} ₽ ={" "}
          <span className={sheetOverallValueVariants()}>
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
              pillVariants({ tone: "danger", radius: "full" }),
              "px-2 py-0.5 text-xs font-medium",
            )}
          >
            {claimsErrorMessage}
          </div>
        )}
      </div>

      {!newDraftClaim && (
        <div className="px-4 pb-3">
          <Button
            variant="ghost"
            className={cn("w-full", addShareButtonVariants())}
            onClick={startAdding}
          >
            + {t("addShare")}
          </Button>
        </div>
      )}

      {/* Scrollable shares area */}
      <div
        className={cn(
          "flex-1 overflow-y-auto px-4 space-y-3",
          hasClaimsError && claimsErrorRingVariants(),
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

      <DrawerFooter className={cn("pt-2", footerVariants())}>
        <div className="px-4 py-3">
          <div className="flex justify-between text-sm mb-2">
            <span className={footerLabelVariants()}>{t("distributed")}</span>
            <span className="font-medium">
              {totalClaimed.toFixed(0)} / {localPosition.overall} ₽
            </span>
          </div>
          <DistributionBar
            data={effectivePosition}
            className="h-3"
          />
        </div>
        <div className="flex gap-2">
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
            <Pencil className="h-4 w-4" />
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
