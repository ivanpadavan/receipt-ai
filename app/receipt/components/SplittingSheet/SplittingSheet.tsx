"use client";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import React, { useState, useCallback } from "react";
import { t } from "@/app/i18n/translations";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useReceiptState } from "../ReceiptForm";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { ParticipantAvatar } from "@/components/ui/participant-avatar";
import { DistributionBar } from "./DistributionBar";
import { ReceiptPosition } from "@/model/receipt/model";
import { useWatch } from "react-hook-form";
import { useUser } from "@/context/AuthContext";

// Claim type
type Claim = {
  value: number;
  type: "quantity" | "amount";
  participantIds: string[];
};

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

  const [localPosition, setLocalPosition] = useState<ReceiptPosition>(() =>
    structuredClone(position)
  );

  const { scenario: { form } } = useReceiptState();
  const participants = useWatch({ control: form.control, name: "participants" });

  const claims = localPosition.claims;

  const totalClaimed = claims.reduce((acc, claim) => {
    if (!claim.participantIds || claim.participantIds.length === 0) return acc;
    if (claim.type === "quantity") return acc + claim.value * localPosition.price;
    return acc + claim.value;
  }, 0);

  const { user } = useUser();

  // Find current user's participant ID
  const currentUserParticipantId = participants?.find(
    (p) => p.name === user?.email?.split("@")[0] || p.id === user?.id
  )?.id;

  const [isAdding, setIsAdding] = useState(true);  // Start in adding mode

  const handleSaveClaim = (claim: Claim) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: [...prev.claims, claim],
    }));
    setIsAdding(false);
  };

  const handleUpdateClaim = (index: number, updatedClaim: Claim) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.map((c, i) => (i === index ? updatedClaim : c)),
    }));
  };

  const handleRemoveClaim = (index: number) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.filter((_, i) => i !== index),
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
      {!isAdding && (
        <div className="px-4 pb-3">
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setIsAdding(true)}
          >
            + {t("addShare")}
          </Button>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {/* Add Form (when adding) */}
        {isAdding && (
          <AddClaimForm
            onSave={handleSaveClaim}
            onCancel={() => setIsAdding(false)}
            price={localPosition.price}
            participants={participants}
            defaultParticipantId={currentUserParticipantId}
          />
        )}

        {/* Claims List */}
        {claims.map((claim, index) => (
          <ClaimRow
            key={index}
            claim={claim}
            price={localPosition.price}
            participants={participants}
            onUpdate={(updated) => handleUpdateClaim(index, updated)}
            onRemove={() => handleRemoveClaim(index)}
          />
        ))}
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
          <DistributionBar data={localPosition} className="h-3 rounded-full" />
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
  claim: Claim;
  price: number;
  participants: { id: string; name: string; color: string }[];
  onUpdate: (claim: Claim) => void;
  onRemove: () => void;
}

const ClaimRow: React.FC<ClaimRowProps> = ({
  claim,
  price,
  participants,
  onUpdate,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const amount = claim.type === "quantity" ? claim.value * price : claim.value;

  // Get selected participants for stacked avatars
  const selectedParticipants = participants.filter((p) =>
    claim.participantIds.includes(p.id)
  );

  if (isEditing) {
    return (
      <div className="border rounded-md p-3 space-y-3">
        <EditClaimContent
          claim={claim}
          price={price}
          participants={participants}
          onSave={(updated) => {
            onUpdate(updated);
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header - always visible, clickable to expand */}
      <div
        className={cn(
          "flex justify-between items-center p-3 cursor-pointer transition-colors",
          isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Claim info - left side */}
        <div className="flex items-baseline gap-2">
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

        {/* Right side - avatars + actions */}
        <div className="flex items-center gap-2">
          {/* Stacked avatars with colored ring */}
          <div className="flex -space-x-2">
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

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded content - participants selector */}
      {isExpanded && (
        <div className="px-3 py-2 border-t bg-background">
          <ParticipantsSelector
            selectedIds={claim.participantIds}
            participants={participants}
            onChange={(ids) => onUpdate({ ...claim, participantIds: ids })}
          />
        </div>
      )}

      {/* Distribution bar - always at bottom, no rounded corners */}
      <DistributionBar data={claim} className="h-2" />
    </div>
  );
};

interface AddClaimFormProps {
  onSave: (claim: Claim) => void;
  onCancel: () => void;
  price: number;
  participants: { id: string; name: string; color: string }[];
  defaultParticipantId?: string;
}

const AddClaimForm: React.FC<AddClaimFormProps> = ({
  onSave,
  onCancel,
  price,
  participants,
  defaultParticipantId,
}) => {
  const [claim, setClaim] = useState<Claim>(() => ({
    ...createDefaultClaim(),
    participantIds: defaultParticipantId ? [defaultParticipantId] : [],
  }));
  const isValid = claim.value > 0;

  return (
    <div className="border rounded-md p-3 space-y-3">
      <EditClaimContent
        claim={claim}
        price={price}
        participants={participants}
        onSave={onSave}
        onChange={setClaim}
      />
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={() => onSave(claim)} disabled={!isValid}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
};

interface EditClaimContentProps {
  claim: Claim;
  price: number;
  participants: { id: string; name: string; color: string }[];
  onSave: (claim: Claim) => void;
  onChange?: (claim: Claim) => void;
}

const EditClaimContent: React.FC<EditClaimContentProps> = ({
  claim,
  price,
  onSave,
  onChange,
}) => {
  const [localClaim, setLocalClaim] = useState<Claim>(claim);

  const handleChange = useCallback(
    (updates: Partial<Claim>) => {
      const updated = { ...localClaim, ...updates };
      setLocalClaim(updated);
      onChange?.(updated);
    },
    [localClaim, onChange]
  );

  const displayAmount =
    localClaim.type === "quantity"
      ? localClaim.value * price
      : localClaim.value;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Select
          value={localClaim.type}
          onValueChange={(v: "quantity" | "amount") => handleChange({ type: v })}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quantity">{t("quantity")}</SelectItem>
            <SelectItem value="amount">{t("amount")}</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          className="flex-1"
          value={localClaim.value || ""}
          onChange={(e) => handleChange({ value: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && localClaim.value) {
              onSave(localClaim);
            }
          }}
        />

        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => onSave(localClaim)}
          disabled={!localClaim.value}
        >
          <Check className="w-5 h-5" />
        </Button>
      </div>

      <div className="text-sm text-right text-muted-foreground">
        = {displayAmount.toFixed(0)} ₽
      </div>
    </div>
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
