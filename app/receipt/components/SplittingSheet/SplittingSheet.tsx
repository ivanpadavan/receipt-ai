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

// --- Types ---

interface Claim {
  value: number;
  type: "quantity" | "amount";
  participantIds: string[];
}

const createDefaultClaim = (): Claim => ({
  value: 0,
  type: "quantity",
  participantIds: [],
});

// --- Components ---

interface EditingHeaderProps {
  claim: Claim;
  onUpdate: (claim: Claim) => void;
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
      {/* Actions (Left) */}
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
        <SelectTrigger className="w-[100px] h-9 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quantity">{t("quantity")}</SelectItem>
          <SelectItem value="amount">{t("amount")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

interface ViewingHeaderProps {
  claim: Claim;
  price: number;
  participants: { id: string; name: string; color: string }[];
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

// --- ClaimRow ---

interface ClaimRowProps {
  claim: Claim;
  participants: { id: string; name: string; color: string }[];
  onUpdate: (claim: Claim) => void;
  header: React.ReactNode;
}

const ClaimRow: React.FC<ClaimRowProps> = ({
  claim,
  participants,
  onUpdate,
  header,
}) => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        value="1"
        className="border rounded-md overflow-hidden data-[state=open]:bg-muted/50"
      >
        <AccordionHeader className="flex items-stretch hover:bg-muted/30 transition-colors bg-background">
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
}) => {
  const position = initialValue as ReceiptPosition;
  const { scenario: { form } } = useReceiptState();
  const participants = useWatch({ control: form.control, name: "participants" });
  const { user } = useUser();

  const [localPosition, setLocalPosition] = useState<ReceiptPosition>(() =>
    structuredClone(position)
  );

  const currentUserParticipantId = participants?.find(
    (p) => p.name === user?.email?.split("@")[0] || p.id === user?.id
  )?.id;

  // --- Draft Claims State (Map) ---
  const [draftClaims, setDraftClaims] = useState<Map<number | "new", Claim>>(
    new Map([
      [
        "new",
        {
          ...createDefaultClaim(),
          participantIds: currentUserParticipantId
            ? [currentUserParticipantId]
            : [],
        },
      ],
    ] as const),
  );


  // Helper to update draft state safely
  const updateDraft = (index: number | "new", claim: Claim) => {
    setDraftClaims(prev => {
      const next = new Map(prev);
      next.set(index, claim);
      return next;
    });
  };

  const removeDraft = (index: number | "new") => {
    setDraftClaims(prev => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  };

  // Create an effective position that includes ALL draft changes for live preview
  const effectivePosition = useMemo(() => {
    const pos = structuredClone(localPosition);

    draftClaims.forEach((claim, index) => {
      if (index === "new") {
        pos.claims.push(claim);
      } else {
        if (typeof index === 'number' && pos.claims[index]) {
          pos.claims[index] = claim;
        }
      }
    });
    return pos;
  }, [localPosition, draftClaims]);

  const totalClaimed = effectivePosition.claims.reduce((acc, claim) => {
    if (!claim.participantIds || claim.participantIds.length === 0) return acc;
    if (claim.type === "quantity") return acc + claim.value * effectivePosition.price;
    return acc + claim.value;
  }, 0);

  const startAdding = () => {
    updateDraft("new", {
      ...createDefaultClaim(),
      participantIds: currentUserParticipantId ? [currentUserParticipantId] : [],
    });
  };

  const handleSaveDraft = (index: number | "new") => {
    const claim = draftClaims.get(index);
    if (!claim) return;

    if (index === "new") {
      if (claim.value > 0) {
        setLocalPosition(prev => ({ ...prev, claims: [...prev.claims, claim] }));
        // Reset the 'new' draft to default for next addition
        updateDraft("new", {
          ...createDefaultClaim(),
          participantIds: currentUserParticipantId ? [currentUserParticipantId] : [],
        });
      }
    } else {
      // Update existing
      setLocalPosition(prev => ({
        ...prev,
        claims: prev.claims.map((c, i) => i === index ? claim : c)
      }));
      // Close edit mode for this item
      removeDraft(index);
    }
  };

  const handleDeleteClaim = (index: number) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.filter((_, i) => i !== index),
    }));
    // Also remove from drafts if being edited
    if (draftClaims.has(index)) {
      removeDraft(index);
    }
  };

  const handleEditClick = (index: number, claim: Claim) => {
    updateDraft(index, claim);
  };

  const handleUpdateClaim = (index: number, updatedClaim: Claim) => {
    // Only used for ViewingHeader updates if allowed (currently not used as ViewingHeader is read-only mostly)
    // But if we ever allow editing from view mode directly:
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.map((c, i) => (i === index ? updatedClaim : c)),
    }));
  };

  const handleDone = () => {
    onSave(localPosition);
  };

  // "new" draft claim
  const newDraftClaim = draftClaims.get("new");

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

      {/* Add share button - only if "new" form is NOT active? Or always allow adding?
          If we allow multiple new items, we need a list of new items.
          Currently we have only one "new" key. So if "new" exists, we are adding.
          Should hide button if "new" is visible.
      */}
      {!draftClaims.has("new") && (
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
              onUpdate={(c) => isEditing
                ? updateDraft(index, c)
                : handleUpdateClaim(index, c)
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
