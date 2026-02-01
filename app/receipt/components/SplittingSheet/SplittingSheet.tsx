import { ClaimForm, defaultClaim, EditModalProps, PositionForm } from "@/app/receipt/[id]/receipt-state";
import { useObservable } from "@/hooks/rx/useObservable";
import React, { useState } from "react";
import { t } from "@/app/i18n/translations";
import { DrawerClose, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useReceiptState } from "../ReceiptForm";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { ParticipantAvatar } from "@/components/ui/participant-avatar";
import { merge } from "rxjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { DistributionBar } from "./DistributionBar";

export const SplittingSheet: React.FC<EditModalProps> = ({
  formGroup,
  onFinish,
}) => {
  const positionFormGroup = formGroup as PositionForm;

  const {
    scenario: { form },
  } = useReceiptState();

  // Watch for changes in the specific position and participants to re-render the global distribution bar
  useObservable(
    merge(formGroup.valueChanges, form.controls.participants.valueChanges),
  );

  const position = positionFormGroup.getRawValue();
  const claims = positionFormGroup.controls.claims.getRawValue();
  const participants = form.controls.participants.getRawValue();

  const totalClaimed = claims.reduce((acc, claim) => {
    if (claim.type === "quantity") {
      return acc + claim.value * position.price;
    }
    return acc + claim.value;
  }, 0);

  const [isAdding, setIsAdding] = useState(false);

  const handleAddClaim = () => {
    setIsAdding(true);
  };

  const handleSaveClaim = (claimForm: ClaimForm) => {
    positionFormGroup.controls.claims.push(claimForm);
    setIsAdding(false);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };



  return (
    <DrawerContent className="max-h-[90vh]">
      <div className="mx-auto w-full max-w-sm">
        <DrawerTitle className="p-4 text-center border-b pt-6">
          <div className="text-lg font-semibold">{position.name}</div>
          <div className="text-sm text-muted-foreground">
            {position.quantity} x {position.price} = {position.overall}
          </div>
        </DrawerTitle>

        <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh] scrollbar-hide">
          {/* Existing Claims List */}
          <div className="space-y-3">
            {positionFormGroup.controls.claims.controls.map(
              (claimControl, index) => (
                <ClaimRow
                  key={index}
                  control={claimControl}
                  onRemove={() =>
                    positionFormGroup.controls.claims.removeAt(index)
                  }
                  price={position.price}
                />
              ),
            )}
          </div>

          {/* Add Button or Add Form */}
          {isAdding ? (
            <AddClaimForm
              onSave={(c) => handleSaveClaim(c)}
              onCancel={handleCancelAdd}
              price={position.price}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={handleAddClaim}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("addMore")}
            </Button>
          )}
        </div>

        {/* Global Distribution Bar */}
        <div className="p-4 pt-0">
          <DistributionBar
            claims={positionFormGroup.controls.claims.getRawValue()}
            total={position.overall}
            price={position.price}
            className="h-4 rounded-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>
              {t("distributed")}: {totalClaimed.toFixed(2)}
            </span>
            <span>
              {t("total")}: {position.overall}
            </span>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button onClick={() => onFinish(form)}>{t("done")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </div>
    </DrawerContent>
  );
};

const ClaimRow = ({
  control,
  onRemove,
  price,
}: {
  control: ClaimForm;
  onRemove: () => void;
  price: number;
}) => {
  useObservable(control.valueChanges);

  const {
    scenario: { form },
  } = useReceiptState();
  // Subscribe to participants changes to update colors dynamically
  useObservable(form.controls.participants.valueChanges);
  const participants = form.controls.participants.getRawValue();

  const val = control.getRawValue();
  const [isEditing, setIsEditing] = useState(false);

  const amount = val.type === "quantity" ? val.value * price : val.value;
  const isAmount = val.type === "amount";

  if (isEditing) {
    return (
      <div className="border rounded-md p-3 space-y-3 bg-white shadow-sm">
        <EditClaimContent
          control={control}
          onSave={() => setIsEditing(false)}
          price={price}
        />
      </div>
    );
  }

  return (
    <div className="border rounded-md p-3 space-y-3 bg-white shadow-sm relative group">
      <div className="flex justify-between items-center">
        <div className="font-medium text-lg flex items-baseline gap-1">
          {val.value}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {isAmount ? "₽" : t("pcs")}
          </span>
          {!isAmount && (
            <span className="text-sm text-muted-foreground ml-2">
              ({amount.toFixed(2)} ₽)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
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
      </div>

      {/* Participants Selector for this Row */}
      <div>
        <ParticipantsSelector
          selectedIds={val.participantIds}
          onChange={(ids) => control.patchValue({ participantIds: ids })}
        />
      </div>

      {/* Mini Distribution Bar for this Row */}
      <DistributionBar
        claims={val}
        price={price}
        className="h-1.5 rounded-full"
      />
    </div>
  );
};

const AddClaimForm = ({
  onSave,
  onCancel,
  price,
}: {
  onSave: (c: ClaimForm) => void;
  onCancel: () => void;
  price: number;
}) => {
  const [form] = useState(defaultClaim());
  useObservable(form.valueChanges);

  return (
    <div className="border rounded-md p-3 space-y-3 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <EditClaimContent
        control={form}
        onSave={() => onSave(form)}
        price={price}
      />
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
};

const EditClaimContent = ({
  control,
  onSave,
  price,
}: {
  control: ClaimForm;
  onSave: () => void;
  price: number;
}) => {
  useObservable(control.valueChanges);
  const val = control.getRawValue();

  const displayAmount = val.type === "quantity" ? val.value * price : val.value;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Select
          value={val.type}
          onValueChange={(v: "quantity" | "amount") =>
            control.patchValue({ type: v })
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
          value={val.value || ""}
          onChange={(e) =>
            control.patchValue({ value: parseFloat(e.target.value) })
          }
          placeholder="0"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && val.value) {
              onSave();
            }
          }}
        />

        <Button
          size="icon"
          className="shrink-0 bg-green-500 hover:bg-green-600 text-white rounded-full h-8 w-8"
          onClick={onSave}
          disabled={!val.value}
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

const ParticipantsSelector = ({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const {
    scenario: { form },
  } = useReceiptState();
  useObservable(form.controls.participants.valueChanges);
  const participants = form.controls.participants.getRawValue();

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
                : "opacity-60 grayscale hover:opacity-80 hover:scale-105",
            )}
            style={{
              borderColor: p.color,
              backgroundColor: isSelected ? "white" : "transparent",
            }}
          >
            <ParticipantAvatar participant={p} className="h-8 w-8" />
            {isSelected && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white">
                <Check className="w-2 h-2 text-white" />
              </div>
            )}
          </button>
        );
      })}
      {/* "Add Participant" button could go here */}
    </div>
  );
};
