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
import { Check, Pencil, Trash2, MoreVertical } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  // Cast to position type
  const position = initialValue as ReceiptPosition;

  // Local state - work with a copy
  const [localPosition, setLocalPosition] = useState<ReceiptPosition>(() =>
    structuredClone(position)
  );

  const { scenario: { form } } = useReceiptState();

  // Watch participants for colors
  const participants = useWatch({ control: form.control, name: "participants" });

  const claims = localPosition.claims;

  const totalClaimed = claims.reduce((acc, claim) => {
    if (!claim.participantIds || claim.participantIds.length === 0) {
      return acc;
    }
    if (claim.type === "quantity") {
      return acc + claim.value * localPosition.price;
    }
    return acc + claim.value;
  }, 0);

  const [isAdding, setIsAdding] = useState(false);

  const handleAddClaim = () => {
    setIsAdding(true);
  };

  const handleSaveClaim = (claim: Claim) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: [...prev.claims, claim],
    }));
    setIsAdding(false);
  };

  const handleCancelAdd = () => {
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
    <DrawerContent className="max-h-[90vh]">
      <div className="mx-auto w-full max-w-sm">
        <DrawerTitle className="px-6 pt-6 pb-4 text-center border-b bg-muted/10">
          <div className="text-xl font-bold tracking-tight">
            {localPosition.name}
          </div>
          <div className="text-sm font-medium text-muted-foreground mt-1 flex justify-center items-center gap-2">
            <span className="bg-muted px-2 py-0.5 rounded-md">
              {localPosition.quantity} {t("pcs")}
            </span>
            <span>x</span>
            <span>{localPosition.price.toFixed(2)} ₽</span>
            <span>=</span>
            <span className="text-primary font-bold">
              {localPosition.overall.toFixed(2)} ₽
            </span>
          </div>
        </DrawerTitle>

        <div className="px-4 py-6 space-y-4 overflow-y-auto max-h-[60vh] scrollbar-hide bg-muted/5">
          {/* Existing Claims List */}
          <div className="space-y-4">
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

          {/* Add Button or Add Form */}
          {isAdding ? (
            <AddClaimForm
              onSave={handleSaveClaim}
              onCancel={handleCancelAdd}
              price={localPosition.price}
              participants={participants}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={handleAddClaim}
            />
          )}
        </div>

        {/* Global Distribution Bar */}
        <div className="p-6 pt-2 border-t bg-background mt-auto">
          <DistributionBar
            data={localPosition}
            className="h-12 rounded-xl ring-1 ring-black/5 text-lg font-bold"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-black/20 backdrop-blur-[2px] rounded-full px-2 py-0.5 text-white text-xs font-bold shadow-sm">
                {((totalClaimed / localPosition.overall) * 100).toFixed(0)}%
              </span>
            </div>
          </DistributionBar>
        </div>

        <DrawerFooter className="px-6 pb-6 pt-2">
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
  const [isEditing, setIsEditing] = useState(false);

  const amount = claim.type === "quantity" ? claim.value * price : claim.value;
  const isAmount = claim.type === "amount";

  if (isEditing) {
    return (
      <div className="border rounded-md p-3 space-y-3 bg-white shadow-sm">
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
    <div className="bg-card rounded-xl border p-4 shadow-sm transition-all hover:shadow-md relative group space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl tracking-tight text-foreground">
              {claim.value}
            </span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {isAmount ? "₽" : t("pcs")}
            </span>
            {!isAmount && (
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded ml-1">
                {amount.toFixed(2)} ₽
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground -mr-2 -mt-2"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              {t("editPosition")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {/* Participants Selector */}
        <div className="flex items-center gap-2">
          <ParticipantsSelector
            selectedIds={claim.participantIds}
            participants={participants}
            onChange={(ids) => onUpdate({ ...claim, participantIds: ids })}
          />
        </div>

        {/* Mini Distribution Bar */}
        <div className="pt-2">
          <DistributionBar
            data={claim}
            className="h-2 rounded-full ring-1 ring-black/5"
          />
        </div>
      </div>
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
    <div className="bg-card rounded-xl border p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <EditClaimContent
        claim={claim}
        price={price}
        participants={participants}
        onSave={onSave}
        onChange={setClaim}
      />
      <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-dashed">
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
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Select
          value={localClaim.type}
          onValueChange={(v: "quantity" | "amount") =>
            handleChange({ type: v })
          }
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
          onChange={(e) =>
            handleChange({ value: parseFloat(e.target.value) || 0 })
          }
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
          className="shrink-0 bg-green-500 hover:bg-green-600 text-white rounded-full h-8 w-8"
          onClick={() => onSave(localClaim)}
          disabled={!localClaim.value}
        >
          <Check className="w-5 h-5" />
        </Button>
      </div>

      <div className="text-sm text-right text-muted-foreground px-1">
        = {displayAmount.toFixed(2)}
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
              "relative rounded-full p-0.5 transition-all text-xs font-medium flex items-center justify-center border-2 ring-offset-2",
              isSelected
                ? "opacity-100 scale-105 ring-2 ring-primary/20"
                : "opacity-60 grayscale hover:opacity-80 hover:scale-105"
            )}
            style={{
              borderColor: p.color,
              backgroundColor: isSelected ? "white" : "transparent",
            }}
          >
            <ParticipantAvatar participant={p} className="h-8 w-8" />
          </button>
        );
      })}
    </div>
  );
};
