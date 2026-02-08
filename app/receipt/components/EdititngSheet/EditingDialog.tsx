"use client";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import React, { useEffect, useState } from "react";
import { t, TranslationKey } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Receipt,
  ReceiptModifier,
  ReceiptPosition,
} from "@/model/receipt/model";
import { useReceiptState } from "../ReceiptForm";
import { useRowConflict } from "./useRowConflict";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  iconButtonVariants,
  iconSoloVariants,
} from "@/app/receipt/components/ui-styles";
import { cn } from "@/utils/cn";

type EditableValue = ReceiptPosition | ReceiptModifier | Receipt["totals"];

const isPosition = (v: EditableValue): v is ReceiptPosition =>
  "quantity" in v && "price" in v;

type EditingDialogProps = EditModalProps & {
  onRequestClose: () => void;
};

export const EditingDialog: React.FC<EditingDialogProps> = ({
  fields,
  validator,
  initialValue,
  header,
  onSave,
  onRemove,
  fieldPath,
  onRequestClose,
}) => {
  const receiptState = useReceiptState();
  const {
    scenario: { form },
  } = receiptState;
  const { setValue } = form;

  const [localValue, setLocalValue] = useState<EditableValue>(() =>
    structuredClone(initialValue),
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { conflict, resolveConflict } = useRowConflict({
    localValue,
    initialValue,
    form,
    fieldPath,
  });

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

  const handleChange = (
    key: string,
    rawValue: string,
    valueType: "string" | "number",
  ) => {
    setTouched((prev) => new Set(prev).add(key));

    const newValue = { ...localValue } as Record<string, unknown>;
    if (valueType === "number") {
      const sanitized = rawValue.replace(/,/g, ".");
      const parsed = parseFloat(sanitized);
      newValue[key] = isNaN(parsed) ? 0 : parsed;
    } else {
      newValue[key] = rawValue;
    }

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

  const isValid = Object.keys(errors).length === 0;
  const isSaveDisabled = !isValid || conflict?.type === "deleted";
  const hideErrorsUntilTouched =
    header === "addPosition" || header === "addDiscount" || header === "addFee";
  const visibleErrors = Object.entries(errors).filter(
    ([key]) => !hideErrorsUntilTouched || touched.has(key),
  );

  const handleSave = () => {
    onSave(localValue);
    onRequestClose();
  };

  const handleRemove = () => {
    onRemove?.();
    onRequestClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isSaveDisabled) {
          handleSave();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-center sm:text-center">{t(header)}</DialogTitle>
        <DialogDescription className="sr-only">{t(header)}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        {conflict && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">{conflict.message}</p>
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
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <ul className="list-disc space-y-1 pl-5">
              {visibleErrors.map(([key, error], index) => (
                <li key={index} className="text-sm text-red-700">
                  <strong>{t(key as TranslationKey)}:</strong> {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <FieldGroup>
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
        </FieldGroup>
      </div>

      <div className="mt-5 flex w-full items-center justify-between sm:justify-between">
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                iconSoloVariants({ size: "compact" }),
                iconButtonVariants({ size: "compact", tone: "danger" }),
              )}
              onClick={handleRemove}
              aria-label={t("remove")}
              title={t("remove")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button type="submit" disabled={isSaveDisabled}>
            {t("save")}
          </Button>
      </div>
    </form>
  );
};

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
    <Field>
      <Label className="mb-1 block text-sm font-medium text-foreground">
        {t(label)}
      </Label>
      <Input
        type={type === "number" ? "number" : "text"}
        inputMode={type === "number" ? "decimal" : "text"}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${hasError ? "border-destructive focus-visible:ring-destructive" : ""} ${disabled ? "bg-muted text-muted-foreground" : ""}`}
      />
    </Field>
  );
};
