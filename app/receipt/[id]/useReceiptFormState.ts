"use client";

import {
  FieldPath,
  useFieldArray,
  useForm,
  UseFormReturn,
} from "react-hook-form";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  debounceTime,
  distinctUntilChanged,
  ignoreElements,
  skip,
  startWith,
  Subject,
  switchMap,
} from "rxjs";
import { isEqual } from "lodash-es";

import { TranslationKey } from "@/app/i18n/translations";
import {
  calculateGrandTotal,
  calculateTotal,
  Receipt,
  ReceiptModifier,
  ReceiptPosition,
  ReceiptPositionClaim,
} from "@/model/receipt/model";
import { apiClient } from "@/app/api-client";
import { useObservable } from "@/hooks/rx/useObservable";
import {
  editableModifierSchema,
  editablePositionValidationSchema,
  editableTotalsSchema,
  receiptValidationSchema,
} from "@/app/receipt/[id]/receiptValidation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

type FormType = "validation" | "editing" | "splitting" | "summary";

export interface CanEdit {
  positionForm: boolean | "splitting" | false;
  modifierForm: boolean;
  totalsForm: boolean;
}

export interface FormScenario {
  type: FormType;
  canEdit: CanEdit;
  form: UseFormReturn<Receipt>;
}

// EditModalProps - работает с копией данных, как в оригинале
export interface EditModalProps {
  fields: {
    key: string;
    label: TranslationKey;
    type: "string" | "number";
    disabled?: boolean;
  }[];
  validator: z.ZodTypeAny;
  // Тип редактируемого элемента
  fieldType: "position" | "modifier" | "totals";
  // Для модификаторов: fee или discount
  modifierType?: "fees" | "discounts";
  // Field path for syncing edits into react-hook-form
  fieldPath?: FieldPath<Receipt>;
  // Копия данных для редактирования (не привязана к основной форме)
  initialValue: ReceiptPosition | ReceiptModifier | Receipt["totals"];
  // Заголовок модального окна
  header: TranslationKey;
  // Callback при сохранении — получает отредактированные данные
  onSave: (data: ReceiptPosition | ReceiptModifier | Receipt["totals"]) => void;
  // Callback при удалении (если доступен)
  onRemove?: () => void;
}

export interface ReceiptState {
  scenario: FormScenario;
  openEditModal: (
    v:
      | { type: "position"; index: number }
      | { type: "modifier"; modifierType: "fees" | "discounts"; index: number }
      | { type: "totals" }
      | "addPosition"
      | "addDiscount"
      | "addFee",
  ) => void;
  closeModal: () => void;
  proceed: () => void;
  goBack: () => void;
  goBackToEditing: () => void;
  canProceed: boolean;
  editModalProps: EditModalProps | null;
}

// ============================================================================
// Constants
// ============================================================================

const permissions: Record<FormType, CanEdit> = {
  validation: {
    positionForm: true,
    modifierForm: true,
    totalsForm: true,
  },
  editing: {
    positionForm: true,
    modifierForm: true,
    totalsForm: false,
  },
  splitting: {
    positionForm: "splitting",
    modifierForm: false,
    totalsForm: false,
  },
  summary: {
    positionForm: false,
    modifierForm: false,
    totalsForm: false,
  },
};

// ============================================================================
// Default Value Factories
// ============================================================================

export const createDefaultClaim = (): ReceiptPositionClaim => ({
  id: crypto.randomUUID(),
  value: 0,
  type: "quantity",
  participantIds: [],
});

export const createDefaultPosition = (numberOfClaims = 0): ReceiptPosition => ({
  id: crypto.randomUUID(),
  name: "",
  price: 0,
  quantity: 0,
  overall: 0,
  claims: Array.from({ length: numberOfClaims }, createDefaultClaim),
});

export const createDefaultModifier = (): ReceiptModifier => ({
  id: crypto.randomUUID(),
  name: "",
  value: 0,
});

// ============================================================================
// Hook
// ============================================================================

export function useReceiptFormState(
  initialData: Receipt,
  receiptId = "",
): ReceiptState {
  // -------------------------------------------------------------------------
  // 1. Determine form type
  // -------------------------------------------------------------------------
  const typeRef = useRef<FormType | null>(null);

  if (typeRef.current === null) {
    const isValid = receiptValidationSchema.safeParse(initialData).success;
    typeRef.current = isValid
      ? initialData.editingFinished
        ? "splitting"
        : "editing"
      : "validation";
  }

  const type = typeRef.current;

  // -------------------------------------------------------------------------
  // 2. Initialize react-hook-form
  // -------------------------------------------------------------------------
  const form = useForm<Receipt>({
    values: initialData,
    resetOptions: {
      keepErrors: true,
    },
    mode: "onChange",
    resolver: zodResolver(receiptValidationSchema),
  });

  const { control, watch, setValue, getValues, formState, trigger } = form;
  const isResettingRef = useRef(false);
  const lastInitialDataRef = useRef(initialData);

  // -------------------------------------------------------------------------
  // 3. Field arrays
  // -------------------------------------------------------------------------
  const positionsField = useFieldArray({ control, name: "positions" });
  const feesField = useFieldArray({ control, name: "fees" });
  const discountsField = useFieldArray({ control, name: "discounts" });

  // -------------------------------------------------------------------------
  // 3.5. Revalidation trigger (для validation режима)
  // -------------------------------------------------------------------------
  useEffect(() => {
    form.trigger();
  }, [type, initialData]);

  // -------------------------------------------------------------------------
  // 4. Auto-calculation (для editing/splitting режимов)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (type === "validation") return;

    const subscription = watch((value, { name }) => {
      if (!name) return;

      // Пересчёт overall позиции при изменении quantity/price
      if (name.match(/^positions\.\d+\.(quantity|price)$/)) {
        const match = name.match(/^positions\.(\d+)\./);
        if (match) {
          const idx = parseInt(match[1], 10);
          const positions = getValues("positions");
          const pos = positions[idx];
          if (pos) {
            const overall = pos.quantity * pos.price;
            setValue(`positions.${idx}.overall`, overall, {
              shouldValidate: true,
            });
          }
        }
      }

      // Пересчёт total и grandTotal при любых изменениях позиций/модификаторов
      if (
        name.startsWith("positions") ||
        name.startsWith("fees") ||
        name.startsWith("discounts")
      ) {
        const data = getValues();
        const total = calculateTotal(data.positions);
        const grandTotal = calculateGrandTotal(data);

        setValue("totals.total", total, { shouldValidate: true });
        setValue("totals.grandTotal", grandTotal, { shouldValidate: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [type, watch, getValues, setValue]);

  // -------------------------------------------------------------------------
  // 4.5. Sync external receipt updates into the form
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (lastInitialDataRef.current === initialData) return;
    lastInitialDataRef.current = initialData;

    const currentValues = getValues();
    if (isEqual(currentValues, initialData)) return;

    isResettingRef.current = true;
    form.reset(initialData);
    setTimeout(() => {
      isResettingRef.current = false;
    }, 0);
  }, [initialData, form, getValues]);

  // -------------------------------------------------------------------------
  // 5. Auto-save effect (для editing режима)
  // -------------------------------------------------------------------------
  const updateReceiptRef = useRef<Subject<Receipt>>(new Subject<Receipt>());
  // Setup auto-save pipeline
  useObservable(
    useMemo(() => {
      return updateReceiptRef.current.pipe(
        startWith(initialData),
        debounceTime(100),
        distinctUntilChanged(isEqual),
        skip(1),
        switchMap((data) => {
          return apiClient.updateReceipt(receiptId, data);
        }),
        ignoreElements(),
      );
    }, [initialData, receiptId]),
    null,
  );

  // Watch for form changes and trigger auto-save
  useEffect(() => {
    const subscription = watch(() => {
      if (isResettingRef.current) return;
      // Use getValues() to get complete form data instead of partial watch data
      const completeData = getValues();

      if (completeData && updateReceiptRef.current) {
        updateReceiptRef.current.next(completeData);
      }
    });

    return () => subscription.unsubscribe();
  }, [type, receiptId, watch, getValues]);

  // -------------------------------------------------------------------------
  // 7. Modal state
  // -------------------------------------------------------------------------
  const [editModalProps, setEditModalProps] = useState<EditModalProps | null>(
    null,
  );
  const openEditModal = useCallback(
    (
      args:
        | { type: "position"; index: number }
        | {
            type: "modifier";
            modifierType: "fees" | "discounts";
            index: number;
          }
        | { type: "totals" }
        | "addPosition"
        | "addDiscount"
        | "addFee",
    ) => {
      if (typeof args === "object" && "type" in args) {
        if (args.type === "position") {
          const position = structuredClone(
            getValues(`positions.${args.index}`),
          );
          const idx = args.index;
          setEditModalProps({
            validator: editablePositionValidationSchema,
            fields:
              type === "validation"
                ? [
                    { key: "name", label: "name", type: "string" },
                    { key: "price", label: "price", type: "number" },
                    { key: "quantity", label: "quantity", type: "number" },
                    { key: "overall", label: "overall", type: "number" },
                  ]
                : [
                    { key: "name", label: "name", type: "string" },
                    { key: "price", label: "price", type: "number" },
                    { key: "quantity", label: "quantity", type: "number" },
                    { key: "overall", label: "overall", type: "number", disabled: true },
                  ],
            fieldType: "position",
            fieldPath: `positions.${idx}`,
            initialValue: position,
            header: "editPosition",
            onSave: (data) => {
              positionsField.update(idx, data as ReceiptPosition);
              trigger();
            },
            onRemove: () => {
              positionsField.remove(idx);
              trigger();
            },
          });
        } else if (args.type === "modifier") {
          const modifier = structuredClone(
            getValues(`${args.modifierType}.${args.index}`),
          );
          const idx = args.index;
          const modType = args.modifierType;
          setEditModalProps({
            validator: editableModifierSchema,
            fields: [
              { key: "name", label: "modifierName", type: "string" },
              { key: "value", label: "modifierValue", type: "number" },
            ],
            fieldType: "modifier",
            modifierType: modType,
            fieldPath: `${modType}.${idx}`,
            initialValue: modifier,
            header: modType === "fees" ? "editFee" : "editDiscount",
            onSave: (data) => {
              if (modType === "fees") {
                feesField.update(idx, data as ReceiptModifier);
              } else {
                discountsField.update(idx, data as ReceiptModifier);
              }
              trigger();
            },
            onRemove: () => {
              if (modType === "fees") {
                feesField.remove(idx);
              } else {
                discountsField.remove(idx);
              }
              trigger();
            },
          });
        } else if (args.type === "totals") {
          const totals = structuredClone(getValues("totals"));
          setEditModalProps({
            validator: editableTotalsSchema,
            fields: [
              { key: "total", label: "total", type: "number" },
              { key: "grandTotal", label: "grandTotal", type: "number" },
            ],
            fieldType: "totals",
            fieldPath: "totals",
            initialValue: totals,
            header: "overall",
            onSave: (data) => {
              setValue("totals", data as Receipt["totals"], {
                shouldValidate: true,
              });
            },
          });
        }
      } else if (args === "addPosition") {
        const newPosition = createDefaultPosition(0);
        setEditModalProps({
          validator: editablePositionValidationSchema,
          fields: [
            { key: "name", label: "name", type: "string" },
            { key: "price", label: "price", type: "number" },
            { key: "quantity", label: "quantity", type: "number" },
            {
              key: "overall",
              label: "overall",
              type: "number",
              disabled: type === "editing",
            },
          ],
          fieldType: "position",
          initialValue: newPosition,
          header: "addPosition",
          onSave: (data) => {
            positionsField.prepend(data as ReceiptPosition);
            trigger();
          },
        });
      } else if (args === "addFee") {
        const newFee = createDefaultModifier();
        setEditModalProps({
          validator: editableModifierSchema,
          fields: [
            { key: "name", label: "modifierName", type: "string" },
            { key: "value", label: "modifierValue", type: "number" },
          ],
          fieldType: "modifier",
          modifierType: "fees",
          initialValue: newFee,
          header: "addFee",
          onSave: (data) => {
            feesField.prepend(data as ReceiptModifier);
            trigger();
          },
        });
      } else if (args === "addDiscount") {
        const newDiscount = createDefaultModifier();
        setEditModalProps({
          validator: editableModifierSchema,
          fields: [
            { key: "name", label: "modifierName", type: "string" },
            { key: "value", label: "modifierValue", type: "number" },
          ],
          fieldType: "modifier",
          modifierType: "discounts",
          initialValue: newDiscount,
          header: "addDiscount",
          onSave: (data) => {
            discountsField.prepend(data as ReceiptModifier);
            trigger();
          },
        });
      }
    },
    [
      getValues,
      setValue,
      setEditModalProps,
      positionsField,
      feesField,
      discountsField,
      trigger,
    ],
  );

  /*
  useEffect(() => {
    if (!editModalProps || editModalProps.fieldType !== 'position' || type !== 'splitting') return;

    setEditModalProps((prev) => {
      if (!prev || !prev.index) return prev;
      return { ...prev, initialValue: initialData.positions[prev.index] };
    });
  }, [initialData, editModalProps, type]);
  */

  // -------------------------------------------------------------------------
  // 7. Proceed logic
  // -------------------------------------------------------------------------
  const proceed$ = useMemo(() => new Subject<void>(), []);

  const [, setForceUpdate] = useState(0);

  const proceed = useCallback(() => {
    if (!formState.isValid) return;

    if (type === "editing") {
      // Переход в splitting mode
      const data = getValues();
      apiClient
        .updateReceipt(receiptId, { ...data, editingFinished: true })
        .then(() => {
          typeRef.current = "splitting";
          setValue("editingFinished" as keyof Receipt, true as never);
          setForceUpdate((v) => v + 1);
        });
    } else if (type === "validation") {
      // Переход в editing mode
      typeRef.current = "editing";
      setForceUpdate((v) => v + 1);
    } else if (type === "splitting") {
      // Переход в summary mode
      typeRef.current = "summary";
      setForceUpdate((v) => v + 1);
    }

    proceed$.next();
  }, [formState.isValid, type, getValues, receiptId, setValue, proceed$]);

  // -------------------------------------------------------------------------
  // 7.5. Go back to editing logic
  // -------------------------------------------------------------------------
  const goBackToEditing = useCallback(() => {
    if (type !== "splitting") return;

    const data = getValues();
    apiClient
      .updateReceipt(receiptId, { ...data, editingFinished: false })
      .then(() => {
        typeRef.current = "editing";
        setValue("editingFinished" as keyof Receipt, false as never);
        setForceUpdate((v) => v + 1);
      });
  }, [type, getValues, receiptId, setValue]);

  const goBack = useCallback(() => {
    if (type === "summary") {
      typeRef.current = "splitting";
      setForceUpdate((v) => v + 1);
    } else if (type === "splitting") {
      goBackToEditing();
    }
  }, [type, goBackToEditing]);

  // -------------------------------------------------------------------------
  // 8. Return state
  // -------------------------------------------------------------------------
  return {
    scenario: {
      type,
      form,
      canEdit: permissions[type],
    },
    canProceed: formState.isValid,
    proceed,
    goBack,
    goBackToEditing,
    openEditModal,
    closeModal: () => setEditModalProps(null),
    editModalProps,
  };
}
