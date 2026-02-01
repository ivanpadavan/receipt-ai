"use client";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { t, TranslationKey } from "@/app/i18n/translations";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
  useWithinDrawerContext,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ReceiptPosition,
  ReceiptModifier,
  Receipt,
} from "@/model/receipt/model";
import { useReceiptState } from "../ReceiptForm";

type EditableValue = ReceiptPosition | ReceiptModifier | Receipt["totals"];

// Helper to check if value is position
const isPosition = (v: EditableValue): v is ReceiptPosition =>
  "quantity" in v && "price" in v;

// Helper to check if value is modifier
const isModifier = (v: EditableValue): v is ReceiptModifier =>
  "value" in v && "name" in v && !("total" in v);

// Helper to check if value is totals
const isTotals = (v: EditableValue): v is Receipt["totals"] =>
  "total" in v && "grandTotal" in v;

// Get editable fields based on value type and mode
const getEditableFields = (
  value: EditableValue,
  mode: "editing" | "validation" | "splitting"
): { key: string; label: TranslationKey; type: "string" | "number"; disabled?: boolean }[] => {
  if (isPosition(value)) {
    // In editing mode, overall is computed and should be disabled
    // In validation mode, overall is editable
    const isOverallDisabled = mode === "editing";
    return [
      { key: "name", label: "name", type: "string" },
      { key: "price", label: "price", type: "number" },
      { key: "quantity", label: "quantity", type: "number" },
      { key: "overall", label: "overall", type: "number", disabled: isOverallDisabled },
    ];
  } else if (isModifier(value)) {
    return [
      { key: "name", label: "modifierName", type: "string" },
      { key: "value", label: "modifierValue", type: "number" },
    ];
  } else if (isTotals(value)) {
    return [
      { key: "total", label: "total", type: "number" },
      { key: "grandTotal", label: "grandTotal", type: "number" },
    ];
  }
  return [];
};

export const EditingSheet: React.FC<EditModalProps> = ({
  fieldType,
  initialValue,
  header,
  onSave,
  onRemove,
}) => {
  // Get current mode from context
  const { scenario: { type: mode } } = useReceiptState();

  // Local state - работаем с копией данных
  const [localValue, setLocalValue] = useState<EditableValue>(() =>
    structuredClone(initialValue)
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toastId = useRef<string | number | undefined>(undefined);
  const { closing } = useWithinDrawerContext();

  // Dismiss toast on closing
  useEffect(
    () => (closing && toast.dismiss(toastId.current), void 0),
    [closing]
  );

  // Get editable fields for this value type
  const fields = getEditableFields(localValue, mode);

  // Validation
  const validate = useCallback((value: EditableValue): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (isPosition(value)) {
      if (!value.name || value.name.trim() === "") {
        errs.name = "Name should not be empty";
      }
      if (value.price <= 0 || isNaN(value.price)) {
        errs.price = "Price should be greater than 0";
      }
      if (value.quantity <= 0 || isNaN(value.quantity)) {
        errs.quantity = "Quantity should be greater than 0";
      }
    } else if (isModifier(value)) {
      if (!value.name || value.name.trim() === "") {
        errs.name = "Name should not be empty";
      }
      if (value.value <= 0 || isNaN(value.value)) {
        errs.value = "Value should be greater than 0";
      }
    }

    return errs;
  }, []);

  // Update validation on value change
  useEffect(() => {
    setErrors(validate(localValue));
  }, [localValue, validate]);

  // Handle field change with auto-calculation for positions
  const handleChange = (key: string, rawValue: string, type: "string" | "number") => {
    setTouched((prev) => new Set(prev).add(key));

    const newValue = { ...localValue } as Record<string, unknown>;

    if (type === "number") {
      // Sanitize numeric input
      const sanitized = rawValue.replace(/,/g, ".");
      const parsed = parseFloat(sanitized);
      newValue[key] = isNaN(parsed) ? 0 : parsed;
    } else {
      newValue[key] = rawValue;
    }

    // Auto-calculate overall for positions in editing mode
    if (isPosition(localValue) && mode === "editing" && (key === "price" || key === "quantity")) {
      const price = key === "price" ? (newValue.price as number) : (localValue.price as number);
      const quantity = key === "quantity" ? (newValue.quantity as number) : (localValue.quantity as number);
      newValue.overall = price * quantity;
    }

    setLocalValue(newValue as EditableValue);
  };

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0;

  // Show errors only for touched fields (except for existing items)
  const hideErrorsUntilTouched = !onRemove;
  const visibleErrors = Object.entries(errors).filter(
    ([key]) => !hideErrorsUntilTouched || touched.has(key)
  );

  // Handle save
  const handleSave = () => {
    onSave(localValue);
  };

  // Handle remove
  const handleRemove = () => {
    onRemove?.();
  };

  return (
    <DrawerContent>
      <DrawerTitle className={"px-4 pt-4 text-center"}>{t(header)}</DrawerTitle>
      <div className={"p-4"}>
        {visibleErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <ul className="list-disc pl-5 space-y-1">
              {visibleErrors.map(([key, error], index) => (
                <li key={index} className="text-sm text-red-700">
                  <strong>{t(key as TranslationKey)}:</strong> {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {fields.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              value={(localValue as Record<string, unknown>)[field.key]}
              type={field.type}
              disabled={field.disabled}
              hasError={
                errors[field.key] !== undefined &&
                (!hideErrorsUntilTouched || touched.has(field.key))
              }
              onChange={(val) => handleChange(field.key, val, field.type)}
            />
          ))}
        </div>
      </div>
      <DrawerFooter>
        <div className="flex justify-between">
          <div>
            {onRemove && (
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemove}
                >
                  {t("remove")}
                </Button>
              </DrawerClose>
            )}
          </div>
          <div className="flex space-x-2">
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                {t("cancel")}
              </Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button type="button" disabled={!isValid} onClick={handleSave}>
                {t("save")}
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerFooter>
    </DrawerContent>
  );
};

// Component for rendering a single form field
interface FormFieldProps {
  label: TranslationKey;
  value: unknown;
  type: "string" | "number";
  hasError: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  type,
  hasError,
  disabled,
  onChange,
}) => {
  const displayValue =
    type === "number" && (value === 0 || isNaN(value as number))
      ? ""
      : String(value ?? "");

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-1">
        {t(label)}
      </label>
      <Input
        type={type === "number" ? "number" : "text"}
        inputMode={type === "number" ? "decimal" : "text"}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${hasError ? "border-destructive focus-visible:ring-destructive" : ""} ${disabled ? "bg-muted text-muted-foreground" : ""}`}
      />
    </div>
  );
};
