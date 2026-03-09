"use client";

import { EditModalProps } from "@/app/receipt/[id]/useReceiptFormState";
import React, { useEffect, useState } from "react";
import { t, TranslationKey } from "@/app/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Receipt,
  ReceiptMeta,
  ReceiptModifier,
  ReceiptPosition,
} from "@/model/receipt/model";
import { useReceiptState } from "../receipt-context";
import { useRowConflict } from "./useRowConflict";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  iconSizeVariants,
  iconButtonVariants,
  iconSoloVariants,
  noticeVariants,
  inputStateVariants,
  dialogHeaderTitle,
  dialogHeader,
  dialogBodySpacing,
  errorList,
  stackGapVariants,
  inlineGapVariants,
} from "@/app/receipt/components/ui-styles";
import { cn } from "@/utils/cn";
import { multiplyMoney } from "@/app/receipt/utils/money";
import { flushSync } from "react-dom";

type EditableValue =
  | ReceiptPosition
  | ReceiptModifier
  | Receipt["totals"]
  | ReceiptMeta;

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
    setLocalValue,
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
      newValue.overall = multiplyMoney(price, quantity);
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
  const formatErrorFieldLabel = (key: string) =>
    t(key as TranslationKey).replace(/:\s*$/, "");

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
      <DialogHeader className={dialogHeader}>
        <DialogTitle className={dialogHeaderTitle}>
          {t(header)}
        </DialogTitle>
        <DialogDescription className="sr-only">{t(header)}</DialogDescription>
      </DialogHeader>
      <div className={cn(dialogBodySpacing, stackGapVariants({ size: "lg" }))}>
        {conflict && (
          <div className={cn(noticeVariants({ tone: "warning" }), "text-center")}>
            <p>{conflict.message}</p>
            {conflict.type === "modified" && (
              <div
                className={cn(
                  "mt-2 flex flex-wrap items-center justify-center",
                  inlineGapVariants({ size: "sm" }),
                )}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const serverValue = resolveConflict("accept");
                    if (serverValue && fieldPath) {
                      flushSync(() => setLocalValue(serverValue));
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
          <div className={noticeVariants({ tone: "danger" })}>
            <ul className={cn(stackGapVariants({ size: "xs" }), errorList)}>
              {visibleErrors.map(([key, error], index) => (
                <li key={index}>
                  <strong>{formatErrorFieldLabel(key)}:</strong> {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <FieldGroup>
          {fields.map((field) => (
            <FormField
              key={field.key}
              fieldId={`${header}-${field.key}`}
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

      <div
        className={cn(
          "mt-5 flex w-full items-center",
          inlineGapVariants({ size: "sm" }),
        )}
      >
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
            <Trash2 className={iconSizeVariants({ size: "sm" })} />
          </Button>
        )}
        <Button type="submit" disabled={isSaveDisabled} className="grow">
          {t("save")}
        </Button>
      </div>
    </form>
  );
};

interface FormFieldProps {
  fieldId: string;
  label: TranslationKey;
  value: unknown;
  type: "string" | "number";
  hasError: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const FormField: React.FC<FormFieldProps> = ({
  fieldId,
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
      <Label htmlFor={fieldId}>{t(label)}</Label>
      <Input
        id={fieldId}
        name={fieldId}
        type={type === "number" ? "number" : "text"}
        inputMode={type === "number" ? "decimal" : "text"}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          inputStateVariants({
            state: hasError ? "error" : disabled ? "disabled" : "default",
          }),
        )}
      />
    </Field>
  );
};
