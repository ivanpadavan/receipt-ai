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
import { multiplyMoney } from "@/app/receipt/utils/money";

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
  createEditableTotalsSchema,
  editableModifierSchema,
  editablePositionValidationSchema,
  receiptValidationSchema,
} from "@/app/receipt/[id]/receiptValidation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryState } from "nuqs";
import { createUuid } from "@/app/receipt/utils/uuid";

// ============================================================================
// Types
// ============================================================================

type FormType = "validation" | "splitting" | "summary";

export interface CanEdit {
  positionForm: boolean;
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
  view: "splitting" | "editing";
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

export type EditModalView = EditModalProps["view"];

export interface EditModalPropsWithClose extends EditModalProps {
  open: boolean;
  close: () => void;
  onClosed: () => void;
}

export type EditModalPropsByView = Record<
  EditModalView,
  EditModalPropsWithClose | null
>;

type OpenEditModalArgs =
  | { type: "position"; index: number; view?: "splitting" | "editing" }
  | { type: "modifier"; modifierType: "fees" | "discounts"; index: number }
  | { type: "totals" }
  | "addPosition"
  | "addDiscount"
  | "addFee";

export interface ReceiptState {
  scenario: FormScenario;
  openEditModal: (v: OpenEditModalArgs) => void;
  proceed: () => void;
  canProceed: boolean;
  editModalProps: EditModalPropsByView;
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
  splitting: {
    positionForm: true,
    modifierForm: true,
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
  id: createUuid(),
  value: 0,
  type: "quantity",
  participantIds: [],
});

export const createDefaultPosition = (numberOfClaims = 0): ReceiptPosition => ({
  id: createUuid(),
  name: "",
  price: 0,
  quantity: 0,
  overall: 0,
  claims: Array.from({ length: numberOfClaims }, createDefaultClaim),
});

export const createDefaultModifier = (): ReceiptModifier => ({
  id: createUuid(),
  name: "",
  value: 0,
});

const useSummaryQuery = () => {
  const [summaryQuery, setSummaryQuery] = useQueryState("summary");
  const summaryInUrl = summaryQuery === "1";
  const setSummaryInUrl = useMemo(
    () =>
      (enabled: boolean) => {
        void setSummaryQuery(enabled ? "1" : null, { history: 'push', scroll: true });
      },
    [setSummaryQuery],
  );
  return { summaryInUrl, setSummaryInUrl };
}

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
  const { summaryInUrl, setSummaryInUrl } = useSummaryQuery();
  const getType = useCallback(() => {
    const parsed = receiptValidationSchema.safeParse(initialData);
    const isValid = parsed.success;
    const hasOnlyClaimIssues =
      !isValid &&
      parsed.error.issues.length > 0 &&
      parsed.error.issues.every((issue) => {
        if (issue.path.length < 3) {
          return false;
        }

        return issue.path[0] === "positions" && issue.path[2] === "claims";
      });

    const canSplit = isValid || hasOnlyClaimIssues;

    if (summaryInUrl && isValid) {
      return "summary";
    } else {
      return canSplit ? "splitting" : "validation";
    }
  }, [summaryInUrl, initialData]);
  const [type, setType] = useState<FormType>(getType);

  useEffect(() => {
    setType(getType());
  }, [setType, getType]);

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
      // Пересчёт overall позиции при изменении quantity/price
      if (name?.match(/^positions\.\d+\.(quantity|price)$/)) {
        const match = name.match(/^positions\.(\d+)\./);
        if (match) {
          const idx = parseInt(match[1], 10);
          const positions = getValues("positions");
          const pos = positions[idx];
          if (pos) {
            const overall = multiplyMoney(pos.price, pos.quantity);
            setValue(`positions.${idx}.overall`, overall, {
              shouldValidate: true,
            });
          }
        }
      }

      // Пересчёт total и grandTotal при любых изменениях позиций/модификаторов
      if (
        !name ||
        name.startsWith("positions") ||
        name.startsWith("fees") ||
        name.startsWith("discounts")
      ) {
        const data = getValues();
        const total = calculateTotal(data.positions);
        const grandTotal = calculateGrandTotal({
          ...data,
          totals: { ...data.totals, total },
        });

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
  const [editModalProps, setEditModalProps] = useState<EditModalPropsByView>({
    splitting: null,
    editing: null,
  });

  const buildModalWithClose = useCallback(
    (props: EditModalProps): EditModalPropsWithClose => {
      const view = props.view;
      return {
        ...props,
        open: true,
        close: () =>
          setEditModalProps((prev) => {
            const current = prev[view];
            if (!current) return prev;
            return { ...prev, [view]: { ...current, open: false } };
          }),
        onClosed: () =>
          setEditModalProps((prev) => ({ ...prev, [view]: null })),
      };
    },
    [setEditModalProps],
  );
  const openEditModal = useCallback(
    (args: OpenEditModalArgs) => {
      if (typeof args === "object" && "type" in args) {
        if (args.type === "position") {
          const position = structuredClone(
            getValues(`positions.${args.index}`),
          );
          const idx = args.index;
          const nextModal = buildModalWithClose({
            view: args.view ?? (type === "splitting" ? "splitting" : "editing"),
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
          setEditModalProps((prev) => ({
            ...prev,
            [nextModal.view]: nextModal,
          }));
        } else if (args.type === "modifier") {
          const modifier = structuredClone(
            getValues(`${args.modifierType}.${args.index}`),
          );
          const idx = args.index;
          const modType = args.modifierType;
          const nextModal = buildModalWithClose({
            view: "editing",
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
          setEditModalProps((prev) => ({ ...prev, editing: nextModal }));
        } else if (args.type === "totals") {
          const receiptSnapshot = getValues();
          const totals = structuredClone(getValues("totals"));
          const nextModal = buildModalWithClose({
            view: "editing",
            validator: createEditableTotalsSchema(receiptSnapshot),
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
          setEditModalProps((prev) => ({ ...prev, editing: nextModal }));
        }
      } else if (args === "addPosition") {
        const newPosition = createDefaultPosition(0);
        const nextModal = buildModalWithClose({
          view: "editing",
          validator: editablePositionValidationSchema,
          fields: [
            { key: "name", label: "name", type: "string" },
            { key: "price", label: "price", type: "number" },
            { key: "quantity", label: "quantity", type: "number" },
            {
              key: "overall",
              label: "overall",
              type: "number",
              disabled: type !== "validation",
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
        setEditModalProps((prev) => ({ ...prev, editing: nextModal }));
      } else if (args === "addFee") {
        const newFee = createDefaultModifier();
        const nextModal = buildModalWithClose({
          view: "editing",
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
        setEditModalProps((prev) => ({ ...prev, editing: nextModal }));
      } else if (args === "addDiscount") {
        const newDiscount = createDefaultModifier();
        const nextModal = buildModalWithClose({
          view: "editing",
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
        setEditModalProps((prev) => ({ ...prev, editing: nextModal }));
      }
    },
    [
      buildModalWithClose,
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
  const proceed = useCallback(() => {
    if (!formState.isValid) return;

    if (type === "splitting") {
      setSummaryInUrl(true);
    } else if (type === "summary") {
      setSummaryInUrl(false);
    }
  }, [formState.isValid, type, setSummaryInUrl]);

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
    openEditModal,
    editModalProps,
  };
}
