import { EditModalProps } from "@/app/receipt/[id]/receipt-state";
import { AbstractControl } from "@/forms/abstract_model";
import { FormControl } from "@/forms/form_control";
import { ValidationErrors } from "@/forms/validators";
import { useObservable } from "@/hooks/rx/useObservable";
import React, { ChangeEvent, useEffect, useMemo, useRef } from "react";
import { t, TranslationKey } from "@/app/i18n/translations";
import { useReceiptState } from "@/app/receipt/components/ReceiptForm";
import { useRowConflict } from "@/app/receipt/components/RowSheet/useRowConflict";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle, useWithinDrawerContext,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const isInErrorState = (c: AbstractControl, hideErrorsUntilTouched: boolean) => {
  return c.errors !== null && (hideErrorsUntilTouched ? c.touched : true);
}

export const RowSheet: React.FC<EditModalProps> = ({ formGroup, onFinish, remove, header, initialValue, getFormGroupCurrentState }) => {
  useObservable(formGroup.valueChanges);
  const hideErrorsUntilTouched = !remove && header !== 'overall';
  const controls = useMemo(() => Object.entries(formGroup.controls).filter(([key]) => key !== 'id'), [formGroup]) as [TranslationKey, FormControl<string | number>][];
  const errors = controls
    .filter(([, c]) => isInErrorState(c, hideErrorsUntilTouched))
    .map(([label, { errors }]) => [label, Object.values(errors as ValidationErrors)] as const);

  const { scenario: { form } } = useReceiptState();

  const { conflict, resolveConflict } = useRowConflict({
    formGroup,
    initialValue,
    getFormGroupCurrentState,
    form
  });

  const toastId = useRef<string | number | undefined>(undefined);
  useEffect(() => {
    if (conflict?.type === 'modified') {
      toastId.current = toast(conflict.message, {
        id: 'conflict',
        description:
          "The server has a different version of this item. You can accept the server's changes or keep your local edit.",
        action: {
          label: 'Accept Server Update',
          onClick: () => resolveConflict('accept'),
        },
        cancel: {
          label: 'Keep My Version',
          onClick: () => resolveConflict('keep')
        },
        duration: 1e7,
      });
    }
  }, [conflict, resolveConflict]);

  const { closing } = useWithinDrawerContext();

  useEffect(() => (closing && toast.dismiss(toastId.current), void 0), [closing]);

  if (conflict?.type === 'deleted') {
    return (
      <DrawerContent>
        <DrawerTitle className={'p-4 pt-4 text-center'}>{t("error")}</DrawerTitle>
        <p className="text-gray-700 mb-4">{conflict.message}</p>
        <DrawerClose asChild>
          <Button
            variant="secondary"
          >
            {t("close")}
          </Button>
        </DrawerClose>
      </DrawerContent>
    );
  }

  return (
    <DrawerContent>
      <DrawerTitle className={'px-4 pt-4 text-center'}>{t(header)}</DrawerTitle>
      <div className={'p-4'}>
        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <ul className="list-disc pl-5 space-y-1">
              {errors.map(([label, fieldErrors], index) => (
                <li key={index} className="text-sm text-red-700">
                  <strong>{t(label)}:</strong> {fieldErrors.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {controls.map(([label, control], idx) => (
            <FormField
              key={idx}
              label={label}
              control={control}
              hideErrorsUntilTouched={hideErrorsUntilTouched}
            />
          ))}
        </div>
      </div>
      <DrawerFooter>
        <div className="flex justify-between">
          <div>
            {remove && (
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => { remove(form); }}
                >
                  {t('remove')}
                </Button>
              </DrawerClose>
            )}
          </div>
          <div className="flex space-x-2">
            <DrawerClose asChild>
              <Button
                type="button"
                variant="secondary"
              >{t('cancel')}</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button
                type="button"
                disabled={formGroup.invalid}
                onClick={() => { onFinish(form); }}
              >
                {t('save')}
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerFooter>
    </DrawerContent>
  );
};

// Component for rendering a single form field
const FormField: React.FC<{ control: FormControl<string | number>, label: TranslationKey, hideErrorsUntilTouched: boolean }> = ({ control, label, hideErrorsUntilTouched }) => {
  const type = typeof control.getRawValue();
  const isInvalid = isInErrorState(control, hideErrorsUntilTouched);

  // Sanitize numeric input to handle both dots and commas as decimal separators
  const sanitizeNumericValue = (value: string): number => {
    // Check if the value contains only valid characters (digits, dot, comma, minus sign)
    const isValidFormat = /^-?[0-9]*[.,]?[0-9]*$/.test(value);

    if (!isValidFormat || value === '') {
      return NaN;
    }

    // Replace all commas with dots for proper decimal parsing
    const sanitizedValue = value.replace(/,/g, '.');

    // Parse the sanitized value to a number
    return parseFloat(sanitizedValue);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    control.markAsTouched();

    if (type === 'number') {
      // For number inputs, use our sanitization function
      const sanitizedValue = sanitizeNumericValue(event.target.value);
      control.patchValue(sanitizedValue);
    } else {
      // For text inputs, use the value as is
      control.patchValue(event.target.value);
    }
  }
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-1">
        {t(label)}
      </label>
      <Input
        type={type === 'number' ? 'number' : 'text'}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={type === 'number' && (control.value === 0 || isNaN(control.value as number)) ? '' : control.value}
        onChange={onChange}
        disabled={control.disabled}
        className={isInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
      />
    </div>
  );
};
