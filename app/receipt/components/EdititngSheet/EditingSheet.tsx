"use client";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import React, { useState, useEffect, useRef } from "react";
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
  Receipt,
  ReceiptPosition,
  ReceiptModifier,
} from "@/model/receipt/model";
import { useReceiptState } from "../ReceiptForm";
import { useRowConflict } from "./useRowConflict";
import { cn } from "@/utils/cn";
import { noticeVariants } from "@/app/receipt/components/ui-styles";

type EditableValue = ReceiptPosition | ReceiptModifier | Receipt["totals"];

// Helper to check if value is position
const isPosition = (v: EditableValue): v is ReceiptPosition =>
  "quantity" in v && "price" in v;

export const EditingSheet: React.FC<EditModalProps> = ({
  fields,
  validator,
  initialValue,
  header,
  onSave,
  onRemove,
  fieldPath,
}) => {
  const receiptState = useReceiptState();
  const {
    scenario: { form },
  } = receiptState;
  const { setValue } = form;

  // Local state - работаем с копией данных
  const [localValue, setLocalValue] = useState<EditableValue>(() =>
    structuredClone(initialValue),
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toastId = useRef<string | number | undefined>(undefined);
  const { closing } = useWithinDrawerContext();

  const { conflict, resolveConflict } = useRowConflict({
    localValue,
    initialValue,
    form,
    fieldPath,
  });

  // Dismiss toast on closing
  useEffect(
    () => (closing && toast.dismiss(toastId.current), void 0),
    [closing],
  );

  // Update validation on value change
  useEffect(() => {
    const parsed = validator.safeParse(localValue);
    if (parsed.success) {
      setErrors({});
      return;
    }

    const nextErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (typeof key === "string" && nextErrors[key] === undefined) {
        nextErrors[key] = issue.message;
      }
    });
    setErrors(nextErrors);
  }, [localValue, validator]);

  // Handle field change with auto-calculation for positions
  const handleChange = (
    key: string,
    rawValue: string,
    valueType: "string" | "number",
  ) => {
    setTouched((prev) => new Set(prev).add(key));

    const newValue = { ...localValue } as Record<string, unknown>;

    if (valueType === "number") {
      // Sanitize numeric input
      const sanitized = rawValue.replace(/,/g, ".");
      const parsed = parseFloat(sanitized);
      newValue[key] = isNaN(parsed) ? 0 : parsed;
    } else {
      newValue[key] = rawValue;
    }

    // Auto-calculate overall for positions in editing mode
    if (
      isPosition(localValue) &&
      fields.some((field) => field.key === "overall" && field.disabled) &&
      (key === "price" || key === "quantity")
    ) {
      const price =
        key === "price"
          ? (newValue.price as number)
          : (localValue.price as number);
      const quantity =
        key === "quantity"
          ? (newValue.quantity as number)
          : (localValue.quantity as number);
      newValue.overall = price * quantity;
    }

    setLocalValue(newValue as EditableValue);
  };

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0;
  const isSaveDisabled = !isValid || conflict?.type === "deleted";

  // Show errors only for touched fields (except for existing items)
  const hideErrorsUntilTouched = !onRemove;
  const visibleErrors = Object.entries(errors).filter(
    ([key]) => !hideErrorsUntilTouched || touched.has(key),
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
        {conflict && (
          <div className={cn("mb-4", noticeVariants({ tone: "warning" }))}>
            <p>{conflict.message}</p>
            {conflict.type === "modified" && (
              <div className="mt-2 flex space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const serverValue = resolveConflict("accept");
                    if (serverValue && fieldPath) {
                      setLocalValue(serverValue);
                      setValue(fieldPath, serverValue as never, {
                        shouldDirty: true,
                      });
                    }
                  }}
                >
                  {t("useServer")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resolveConflict("keep");
                    if (fieldPath) {
                      setValue(fieldPath, localValue as never, {
                        shouldDirty: true,
                      });
                    }
                  }}
                >
                  {t("keepMine")}
                </Button>
              </div>
            )}
          </div>
        )}
        {visibleErrors.length > 0 && (
          <div className={cn("mb-4", noticeVariants({ tone: "danger" }))}>
            <ul className="list-disc pl-5 space-y-1">
              {visibleErrors.map(([key, error], index) => (
                <li key={index}>
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
              <Button
                type="button"
                disabled={isSaveDisabled}
                onClick={handleSave}
              >
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
