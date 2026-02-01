import { ClaimForm, defaultClaim, EditModalProps, PositionForm } from "@/app/receipt/[id]/receipt-state";
import { useObservable } from "@/hooks/rx/useObservable";
import React, { useState } from "react";
import { t } from "@/app/i18n/translations";
import { DrawerClose, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useReceiptState } from "../ReceiptForm";
import { Check, Pencil, Trash2 } from "lucide-react";
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
        <DrawerTitle className="px-6 pt-6 pb-4 text-center border-b bg-muted/10">
          <div className="text-xl font-bold tracking-tight">{position.name}</div>
          <div className="text-sm font-medium text-muted-foreground mt-1 flex justify-center items-center gap-2">
            <span className="bg-muted px-2 py-0.5 rounded-md">{position.quantity} {t("pcs")}</span>
            <span>x</span>
            <span>{position.price.toFixed(2)} ₽</span>
            <span>=</span>
            <span className="text-primary font-bold">{position.overall.toFixed(2)} ₽</span>
          </div>
        </DrawerTitle>

        <div className="px-4 py-6 space-y-4 overflow-y-auto max-h-[60vh] scrollbar-hide bg-muted/5">
          {/* Existing Claims List */}
          <div className="space-y-4">
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
              onClick={handleAddClaim}>
            </Button>
          )}
        </div>

        {/* Global Distribution Bar */}
        <div className="p-6 pt-2 border-t bg-background mt-auto">
          <DistributionBar
            claims={positionFormGroup.controls.claims.getRawValue()}
            total={position.overall}
            price={position.price}
            className="h-12 rounded-xl ring-1 ring-black/5 text-lg font-bold"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-black/20 backdrop-blur-[2px] rounded-full px-2 py-0.5 text-white text-xs font-bold shadow-sm">
                {((totalClaimed / position.overall) * 100).toFixed(0)}%
              </span>
            </div>
          </DistributionBar>
        </div>

        <DrawerFooter className="px-6 pb-6 pt-2">
          <DrawerClose asChild>
            <Button onClick={() => onFinish(form)}>{t("done")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </div>
    </DrawerContent >
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
    <div className="bg-card rounded-xl border p-4 shadow-sm transition-all hover:shadow-md relative group space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl tracking-tight text-foreground">
              {val.value}
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
            selectedIds={val.participantIds}
            onChange={(ids) => control.patchValue({ participantIds: ids })}
          />
        </div>

        {/* Mini Distribution Bar */}
        <div className="pt-2">
          <DistributionBar
            claims={val}
            price={price}
            className="h-2 rounded-full ring-1 ring-black/5"
          />
        </div>
      </div>
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
    <div className="bg-card rounded-xl border p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <EditClaimContent
        control={form}
        onSave={() => onSave(form)}
        price={price}
      />
      <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-dashed">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(form)}
          disabled={!form.getRawValue().value}
        >
          {t("save")}
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
          </button>
        );
      })}
      {/* "Add Participant" button could go here */}
    </div>
  );
};
