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
import { Check, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ParticipantAvatar } from "@/components/ui/participant-avatar";
import { DistributionBar } from "./DistributionBar";
import { ReceiptPosition, ReceiptPositionClaim, ReceiptParticipant } from "@/model/receipt/model";
import { useWatch } from "react-hook-form";
import { useUser } from "@/context/AuthContext";
import { useSplittingLogic } from "./useSplittingLogic";

// --- Components ---

interface EditingHeaderProps {
  claim: ReceiptPositionClaim;
  onUpdate: (claim: ReceiptPositionClaim) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditingHeader: React.FC<EditingHeaderProps> = ({
  claim,
  onUpdate,
  onSave,
  onCancel,
}) => {
  return (
    <div className="flex items-center gap-2 p-3 w-full border-b bg-muted/20">
      {/* Input Value */}
      <Input
        type="number"
        className="flex-1 h-9 bg-background"
        value={claim.value || ""}
        onChange={(e) =>
          onUpdate({ ...claim, value: parseFloat(e.target.value) || 0 })
        }
        placeholder="0"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && claim.value > 0) {
            onSave();
          }
        }}
      />

      {/* Type Select */}
      <Select
        value={claim.type}
        onValueChange={(v: "quantity" | "amount") =>
          onUpdate({ ...claim, type: v })
        }
      >
        <SelectTrigger className="w-[140px] h-9 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quantity">{t("quantity")}</SelectItem>
          <SelectItem value="amount">{t("amount")}</SelectItem>
        </SelectContent>
      </Select>
      {/* Actions */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onCancel}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={onSave}
        disabled={claim.value <= 0}
      >
        <Check className="h-5 w-5" />
      </Button>
    </div>
  );
};

interface ViewingHeaderProps {
  claim: ReceiptPositionClaim;
  price: number;
  participants: ReceiptParticipant[];
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
    claim.participantIds.includes(p.id)
  );

  return (
    <>
      <AccordionTrigger className="flex-1 px-3 py-3 hover:no-underline">
        <div className="flex justify-between items-center w-full">
          {/* Claim info - left side */}
          <div className="flex items-baseline gap-2 text-foreground">
            <span className="font-semibold">{claim.value}</span>
            <span className="text-sm text-muted-foreground">
              {claim.type === "amount" ? "₽" : t("pcs")}
            </span>
            {claim.type !== "amount" && (
              <span className="text-sm text-muted-foreground">
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
                  className="relative ring-2 ring-background rounded-full"
                  style={{ zIndex: selectedParticipants.length - idx }}
                >
                  <ParticipantAvatar participant={p} className="h-7 w-7" />
                </div>
              ))
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                ?
              </div>
            )}
            {selectedParticipants.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-muted-foreground/30">
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
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
              className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50"
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
  participants: ReceiptParticipant[];
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
              "relative rounded-full transition-all",
              !isSelected && "opacity-50 hover:opacity-80"
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
  participants: ReceiptParticipant[];
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
    <Accordion type="single" collapsible defaultValue={defaultOpen ? "1" : undefined}>
      <AccordionItem
        value="1"
        className="border rounded-md overflow-hidden data-[state=open]:bg-muted/50"
      >
        <AccordionHeader className="flex items-stretch hover:bg-muted/30 transition-colors bg-background h-[4rem]">
          {header}
        </AccordionHeader>

        <AccordionContent className="p-0">
          <div className="px-3 py-2 border-t bg-background">
            <ParticipantsSelector
              selectedIds={claim.participantIds}
              participants={participants}
              onChange={(ids) => onUpdate({ ...claim, participantIds: ids })}
            />
          </div>
        </AccordionContent>

        <DistributionBar data={claim} className="h-2" />
      </AccordionItem>
    </Accordion>
  );
};

// --- Main Sheet Component ---

export const SplittingSheet: React.FC<EditModalProps> = ({
  initialValue,
  onSave,
  fieldPath,
}) => {
  const position = initialValue as ReceiptPosition;
  const { scenario: { form } } = useReceiptState();
  const participants = useWatch({ control: form.control, name: "participants" });
  const { user } = useUser();

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
    handleDone
  } = useSplittingLogic({
    initialValue: position,
    currentValue: useWatch({ control: form.control, name: fieldPath! }) as ReceiptPosition,
    onSave,
    currentUser: user,
    participants,
  });

  return (
    <DrawerContent className="h-[85vh] flex flex-col">
      <DrawerTitle className="px-4 pt-4 text-center">
        {localPosition.name}
      </DrawerTitle>

      <div className="px-4 py-2 text-center text-sm text-muted-foreground flex flex-col items-center gap-1">
        <div>
          {localPosition.quantity} {t("pcs")} × {localPosition.price} ₽ ={" "}
          <span className="font-semibold text-foreground">
            {localPosition.overall} ₽
          </span>
        </div>

        {/* Validation Status */}
        {(totalClaimed > localPosition.overall + 0.01) && (
          <div className="text-destructive font-medium text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            {t("overpaid") || "Over"}: {(totalClaimed - localPosition.overall).toFixed(2)} ₽
          </div>
        )}
        {(totalClaimed < localPosition.overall - 0.01) && (
          <div className="text-amber-600 font-medium text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {t("remaining") || "Left"}: {(localPosition.overall - totalClaimed).toFixed(2)} ₽
          </div>
        )}
      </div>

      {!newDraftClaim && (
        <div className="px-4 pb-3">
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={startAdding}
          >
            + {t("addShare")}
          </Button>
        </div>
      )}

      {/* Scrollable shares area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
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
                onUpdate={(c) => updateDraft("new", c)}
                onSave={() => handleSaveDraft("new")}
                onCancel={() => removeDraft("new")}
              />
            }
          />
        )}

        {/* Claims List */}
        {localPosition.claims.map((claim, index) => {
          const isEditing = draftClaims.has(index);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const currentClaim = isEditing ? draftClaims.get(index)! : claim;

          return (
            <ClaimRow
              key={index}
              claim={currentClaim}
              participants={participants}
              onUpdate={(c) =>
                isEditing ? updateDraft(index, c) : handleUpdateClaim(index, c)
              }
              header={
                isEditing ? (
                  <EditingHeader
                    claim={currentClaim}
                    onUpdate={(c) => updateDraft(index, c)}
                    onSave={() => handleSaveDraft(index)}
                    onCancel={() => removeDraft(index)}
                  />
                ) : (
                  <ViewingHeader
                    claim={currentClaim}
                    price={localPosition.price}
                    participants={participants}
                    onEditStart={() => handleEditClick(index, claim)}
                    onRemove={() => handleDeleteClaim(index)}
                  />
                )
              }
            />
          );
        })}
      </div>

      {/* Footer - Distribution + Done button */}

      <DrawerFooter className="pt-2 border-t bg-background">
        <div className="px-4 py-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("distributed")}</span>
            <span className="font-medium">
              {totalClaimed.toFixed(0)} / {localPosition.overall} ₽
            </span>
          </div>
          <DistributionBar
            data={effectivePosition}
            className="h-3 rounded-full"
          />
        </div>
        <DrawerClose asChild>
          <Button
            onClick={handleDone}
            disabled={totalClaimed > localPosition.overall + 0.01}
          >
            {t("done")}
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
};
