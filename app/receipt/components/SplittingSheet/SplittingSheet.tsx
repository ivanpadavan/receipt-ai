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

  const [isAdding, setIsAdding] = useState(false);

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
    <DrawerContent>
      <DrawerTitle className="px-4 pt-4 text-center">
        {localPosition.name}
      </DrawerTitle>

      {/* Position info */}
      <div className="px-4 py-2 text-center text-sm text-muted-foreground">
        {localPosition.quantity} {t("pcs")} × {localPosition.price} ₽ = {" "}
        <span className="font-semibold text-foreground">{localPosition.overall} ₽</span>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
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

        {/* Add Button or Add Form */}
        {isAdding ? (
          <AddClaimForm
            onSave={handleSaveClaim}
            onCancel={() => setIsAdding(false)}
            price={localPosition.price}
            participants={participants}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setIsAdding(true)}
          >
            + {t("addMore")}
          </Button>
        )}
      </div>

      {/* Distribution Bar */}
      <div className="px-4 py-3 border-t">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">{t("distributed")}</span>
          <span className="font-medium">
            {totalClaimed.toFixed(0)} / {localPosition.overall} ₽
          </span>
        </div>
        <DistributionBar data={localPosition} className="h-3 rounded-full" />
      </div>

      <DrawerFooter>
        <DrawerClose asChild>
          <Button onClick={handleDone}>{t("done")}</Button>
        </DrawerClose>
      </DrawerFooter>
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
  const [isEditing, setIsEditing] = useState(false);
  const amount = claim.type === "quantity" ? claim.value * price : claim.value;

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
    <div className="border rounded-md p-3 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-lg">{claim.value}</span>
          <span className="text-sm text-muted-foreground">
            {claim.type === "amount" ? "₽" : t("pcs")}
          </span>
          {claim.type !== "amount" && (
            <span className="text-sm text-muted-foreground">
              = {amount.toFixed(0)} ₽
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Participants */}
      <ParticipantsSelector
        selectedIds={claim.participantIds}
        participants={participants}
        onChange={(ids) => onUpdate({ ...claim, participantIds: ids })}
      />

      {/* Mini Bar */}
      <DistributionBar data={claim} className="h-1.5 rounded-full" />
    </div>
  );
};

interface AddClaimFormProps {
  onSave: (claim: Claim) => void;
  onCancel: () => void;
  price: number;
  participants: { id: string; name: string; color: string }[];
}

const AddClaimForm: React.FC<AddClaimFormProps> = ({
  onSave,
  onCancel,
  price,
  participants,
}) => {
  const [claim, setClaim] = useState<Claim>(createDefaultClaim);
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
              isSelected
                ? "ring-2 ring-offset-1"
                : "opacity-40 hover:opacity-70"
            )}
            style={
              isSelected ? { "--tw-ring-color": p.color } as React.CSSProperties : undefined
            }
          >
            <ParticipantAvatar participant={p} className="h-8 w-8" />
          </button>
        );
      })}
    </div>
  );
};
