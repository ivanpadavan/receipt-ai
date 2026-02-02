"use client";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import React, { useState, useMemo } from "react";
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
import { ReceiptPosition } from "@/model/receipt/model";
import { useWatch } from "react-hook-form";
import { useUser } from "@/context/AuthContext";

// Claim type
interface Claim {
  value: number;
  type: "quantity" | "amount";
  participantIds: string[];
}

// Default claim factory
const createDefaultClaim = (): Claim => ({
  value: 0,
  type: "quantity",
  participantIds: [],
});

export const SplittingSheet: React.FC<EditModalProps> = ({
  initialValue,
  onSave,
}) => {
  const position = initialValue as ReceiptPosition;
  const { scenario: { form } } = useReceiptState();
  const participants = useWatch({ control: form.control, name: "participants" });
  const { user } = useUser();

  const [localPosition, setLocalPosition] = useState<ReceiptPosition>(() =>
    structuredClone(position)
  );

  // Find current user's participant ID
  const currentUserParticipantId = participants?.find(
    (p) => p.name === user?.email?.split("@")[0] || p.id === user?.id
  )?.id;

  // Initialize draft claim
  const [draftClaim, setDraftClaim] = useState<{
    index: number | "new";
    claim: Claim;
  } | null>(() => ({
    index: "new",
    claim: {
      ...createDefaultClaim(),
      participantIds: currentUserParticipantId ? [currentUserParticipantId] : [],
    },
  }));

  // Create an effective position that includes the draft changes for live preview
  const effectivePosition = useMemo(() => {
    // Clone local position deeply to avoid mutation
    const pos = JSON.parse(JSON.stringify(localPosition)) as ReceiptPosition;

    if (draftClaim) {
      if (draftClaim.index === "new") {
        pos.claims.push(draftClaim.claim);
      } else {
        // Update existing
        if (pos.claims[draftClaim.index as number]) {
          pos.claims[draftClaim.index as number] = draftClaim.claim;
        }
      }
    }
    return pos;
  }, [localPosition, draftClaim]);

  // Calculate total claimed based on effective position (live updates)
  const totalClaimed = effectivePosition.claims.reduce((acc, claim) => {
    if (!claim.participantIds || claim.participantIds.length === 0) return acc;
    if (claim.type === "quantity") return acc + claim.value * effectivePosition.price;
    return acc + claim.value;
  }, 0);

  const startAdding = () => {
    setDraftClaim({
      index: "new",
      claim: {
        ...createDefaultClaim(),
        participantIds: currentUserParticipantId ? [currentUserParticipantId] : [],
      },
    });
  };

  const handleSaveDraft = () => {
    if (!draftClaim) return;

    if (draftClaim.index === "new") {
      if (draftClaim.claim.value > 0) {
        setLocalPosition(prev => ({ ...prev, claims: [...prev.claims, draftClaim.claim] }));
      }
    } else {
      // Update existing
      const idx = draftClaim.index as number;
      setLocalPosition(prev => ({
        ...prev,
        claims: prev.claims.map((c, i) => i === idx ? draftClaim.claim : c)
      }));
    }
    // Close draft mode
    setDraftClaim(null);
  };

  const handleCancelDraft = () => {
    setDraftClaim(null);
  };

  const handleDeleteClaim = (index: number) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.filter((_, i) => i !== index),
    }));

    if (draftClaim && draftClaim.index === index) {
      setDraftClaim(null);
    }
  };

  const handleEditClick = (index: number, claim: Claim) => {
    setDraftClaim({ index, claim });
  };

  const handleUpdateClaim = (index: number, updatedClaim: Claim) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.map((c, i) => (i === index ? updatedClaim : c)),
    }));
  };

  const handleDone = () => {
    onSave(localPosition);
  };

  return (
    <DrawerContent className="h-[85vh] flex flex-col">
      <DrawerTitle className="px-4 pt-4 text-center">
        {localPosition.name}
      </DrawerTitle>

      {/* Position info */}
      <div className="px-4 py-2 text-center text-sm text-muted-foreground">
        {localPosition.quantity} {t("pcs")} × {localPosition.price} ₽ ={" "}
        <span className="font-semibold text-foreground">{localPosition.overall} ₽</span>
      </div>

      {/* Add Button on top */}
      {(!draftClaim || draftClaim.index !== "new") && (
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

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        <Accordion
          type="multiple"
          className="space-y-3"
        >
          {/* Add View (only if adding new) */}
          {draftClaim && draftClaim.index === "new" && (
            <ClaimRow
              value="new-claim"
              claim={draftClaim.claim}
              price={localPosition.price}
              participants={participants}
              isEditing={true}
              onUpdate={(c) => setDraftClaim({ ...draftClaim, claim: c })}
              onEditSave={handleSaveDraft}
              onEditCancel={handleCancelDraft}
            />
          )}

          {/* Claims List */}
          {localPosition.claims.map((claim, index) => {
            const isEditing = draftClaim?.index === index;
            // Use draft claim if editing
            const currentClaim = isEditing && draftClaim ? draftClaim.claim : claim;

            return (
              <ClaimRow
                key={index}
                value={`claim-${index}`}
                claim={currentClaim}
                price={localPosition.price}
                participants={participants}
                isEditing={isEditing}
                onUpdate={(c) => isEditing
                  ? setDraftClaim({ ...draftClaim!, claim: c }) // Update draft
                  : handleUpdateClaim(index, c)                 // Update live
                }
                onEditStart={() => handleEditClick(index, claim)}
                onEditSave={handleSaveDraft}
                onEditCancel={handleCancelDraft}
                onRemove={() => handleDeleteClaim(index)}
              />
            );
          })}
        </Accordion>
      </div>

      {/* Footer - Distribution + Done button */}
      <div className="mt-auto border-t bg-background">
        <div className="px-4 py-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("distributed")}</span>
            <span className="font-medium">
              {totalClaimed.toFixed(0)} / {localPosition.overall} ₽
            </span>
          </div>
          <DistributionBar data={effectivePosition} className="h-3 rounded-full" />
        </div>

        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button onClick={handleDone}>{t("done")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </div>
    </DrawerContent>
  );
};

interface ClaimRowProps {
  value: string;
  claim: Claim;
  price: number;
  participants: { id: string; name: string; color: string }[];
  isEditing: boolean;
  onUpdate: (claim: Claim) => void;
  // Edit actions
  onEditStart?: () => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  onRemove?: () => void;
}

const ClaimRow: React.FC<ClaimRowProps> = ({
  value,
  claim,
  price,
  participants,
  isEditing,
  onUpdate,
  onEditStart,
  onEditSave,
  onEditCancel,
  onRemove,
}) => {
  const amount = claim.type === "quantity" ? claim.value * price : claim.value;
  const selectedParticipants = participants.filter((p) =>
    claim.participantIds.includes(p.id)
  );

  return (
    <AccordionItem
      value={value}
      className="border rounded-md overflow-hidden data-[state=open]:bg-muted/50"
    >
      <AccordionHeader className="flex items-stretch hover:bg-muted/30 transition-colors bg-background">
        {isEditing ? (
          // EDIT MODE HEADER (No Trigger)
          <div className="flex items-center gap-2 p-3 w-full border-b bg-muted/20">
            {/* Actions (Left) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onEditCancel?.()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => onEditSave?.()}
              disabled={claim.value <= 0}
            >
              <Check className="h-5 w-5" />
            </Button>

            {/* Input Value */}
            <Input
              type="number"
              className="flex-1 h-9 bg-background"
              value={claim.value || ""}
              onChange={(e) => onUpdate({ ...claim, value: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && claim.value > 0) {
                  onEditSave?.();
                }
              }}
            />

            {/* Type Select */}
            <Select
              value={claim.type}
              onValueChange={(v: "quantity" | "amount") => onUpdate({ ...claim, type: v })}
            >
              <SelectTrigger className="w-[100px] h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">{t("quantity")}</SelectItem>
                <SelectItem value="amount">{t("amount")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          // VIEW MODE HEADER (With Trigger)
          <>
            <AccordionTrigger
              className="flex-1 px-3 py-3 hover:no-underline"
            >
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
                        className="relative"
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
        )}
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
  );
};

interface ParticipantsSelectorProps {
  selectedIds: string[];
  participants: { id: string; name: string; color: string }[];
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
