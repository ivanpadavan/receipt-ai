"use client";

import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import {
    Subject,
    Observable,
    switchMap,
    from,
    ignoreElements,
    of,
    distinctUntilChanged,
    debounceTime,
} from "rxjs";
import { isEqual } from "lodash-es";

import { TranslationKey } from "@/app/i18n/translations";
import {
    Receipt,
    ReceiptPosition,
    ReceiptModifier,
    ReceiptParticipant,
    ReceiptPositionClaim,
    validateReceipt,
    calculateTotal,
    calculateGrandTotal,
} from "@/model/receipt/model";
import { apiClient } from "@/app/api-client";
import { createReceiptResolver } from "./receiptResolver";

// ============================================================================
// Types
// ============================================================================

type FormType = "validation" | "editing" | "splitting";

export interface CanEdit {
    positionForm: boolean | "splitting";
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
    // Тип редактируемого элемента
    fieldType: "position" | "modifier" | "totals";
    // Для модификаторов: fee или discount
    modifierType?: "fees" | "discounts";
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
            | "addFee"
    ) => void;
    proceed: () => void;
    goBackToEditing: () => void;
    canProceed$: Observable<boolean>;
    openEditModalCommand$: Observable<EditModalProps>;
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
};

// ============================================================================
// Default Value Factories
// ============================================================================

export const createDefaultClaim = (): ReceiptPositionClaim => ({
    value: NaN,
    type: "quantity",
    participantIds: [],
});

export const createDefaultPosition = (
    numberOfClaims = 0
): ReceiptPosition => ({
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

export const createDefaultParticipant = (): ReceiptParticipant => ({
    id: crypto.randomUUID(),
    name: "",
    color: "",
});

// ============================================================================
// Hook
// ============================================================================

export function useReceiptFormState(
    initialData: Receipt,
    receiptId = ""
): ReceiptState {
    // -------------------------------------------------------------------------
    // 1. Determine form type
    // -------------------------------------------------------------------------
    const typeRef = useRef<FormType | null>(null);

    if (typeRef.current === null) {
        const validation = validateReceipt(initialData);
        typeRef.current = validation.isValid
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
        defaultValues: initialData,
        mode: "onChange",
        resolver: createReceiptResolver({ type }),
    });

    const { control, watch, setValue, getValues, formState } = form;

    // -------------------------------------------------------------------------
    // 3. Field arrays
    // -------------------------------------------------------------------------
    const positionsField = useFieldArray({ control, name: "positions" });
    const feesField = useFieldArray({ control, name: "fees" });
    const discountsField = useFieldArray({ control, name: "discounts" });
    const participantsField = useFieldArray({ control, name: "participants" });

    // -------------------------------------------------------------------------
    // 3.5. Initial validation trigger (для validation режима)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (type === "validation") {
            // Trigger validation immediately to show errors
            form.trigger();
        }
    }, [type, form]);

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
    // 5. Auto-save effect (для editing режима)
    // -------------------------------------------------------------------------
    const updateReceiptRef = useRef<Subject<Receipt>>(new Subject<Receipt>());

    // Setup auto-save pipeline
    useEffect(() => {
        if (type !== "editing" || !receiptId) return;

        const subscription = updateReceiptRef.current
            .pipe(
                debounceTime(500),
                distinctUntilChanged(isEqual),
                switchMap((data) =>
                    from(apiClient.updateReceipt({ id: receiptId, data })).pipe(
                        ignoreElements()
                    )
                )
            )
            .subscribe({
                error: (err) => console.error("Auto-save error:", err),
            });

        return () => subscription.unsubscribe();
    }, [type, receiptId]);

    // Watch for form changes and trigger auto-save
    useEffect(() => {
        if (type !== "editing" || !receiptId) return;

        const subscription = watch(() => {
            // Use getValues() to get complete form data instead of partial watch data
            const completeData = getValues();
            if (completeData && updateReceiptRef.current) {
                updateReceiptRef.current.next(completeData);
            }
        });

        return () => subscription.unsubscribe();
    }, [type, receiptId, watch, getValues]);

    // -------------------------------------------------------------------------
    // 6. Helper to recalculate totals after manual updates
    // -------------------------------------------------------------------------
    const recalculateTotals = useCallback(() => {
        if (type === "validation") return; // Don't auto-calc in validation mode

        const data = getValues();
        const total = calculateTotal(data.positions);
        const grandTotal = calculateGrandTotal(data);

        setValue("totals.total", total, { shouldValidate: true });
        setValue("totals.grandTotal", grandTotal, { shouldValidate: true });
    }, [type, getValues, setValue]);

    // -------------------------------------------------------------------------
    // 7. Modal state
    // -------------------------------------------------------------------------
    const openEditModalCommand$ = useMemo(
        () => new Subject<EditModalProps>(),
        []
    );

    const openEditModal = useCallback(
        (
            args:
                | { type: "position"; index: number }
                | { type: "modifier"; modifierType: "fees" | "discounts"; index: number }
                | { type: "totals" }
                | "addPosition"
                | "addDiscount"
                | "addFee"
        ) => {
            if (typeof args === "object" && "type" in args) {
                if (args.type === "position") {
                    const position = structuredClone(getValues(`positions.${args.index}`));
                    const idx = args.index;
                    openEditModalCommand$.next({
                        fieldType: "position",
                        initialValue: position,
                        header: "editPosition",
                        onSave: (data) => {
                            setValue(`positions.${idx}`, data as ReceiptPosition, { shouldValidate: true });
                            recalculateTotals();
                        },
                        onRemove: () => {
                            positionsField.remove(idx);
                        },
                    });
                } else if (args.type === "modifier") {
                    const modifier = structuredClone(getValues(`${args.modifierType}.${args.index}`));
                    const idx = args.index;
                    const modType = args.modifierType;
                    openEditModalCommand$.next({
                        fieldType: "modifier",
                        modifierType: modType,
                        initialValue: modifier,
                        header: modType === "fees" ? "editFee" : "editDiscount",
                        onSave: (data) => {
                            setValue(`${modType}.${idx}`, data as ReceiptModifier, { shouldValidate: true });
                            recalculateTotals();
                        },
                        onRemove: () => {
                            if (modType === "fees") {
                                feesField.remove(idx);
                            } else {
                                discountsField.remove(idx);
                            }
                        },
                    });
                } else if (args.type === "totals") {
                    const totals = structuredClone(getValues("totals"));
                    openEditModalCommand$.next({
                        fieldType: "totals",
                        initialValue: totals,
                        header: "overall",
                        onSave: (data) => {
                            setValue("totals", data as Receipt["totals"], { shouldValidate: true });
                        },
                    });
                }
            } else if (args === "addPosition") {
                const newPosition = createDefaultPosition(0);
                openEditModalCommand$.next({
                    fieldType: "position",
                    initialValue: newPosition,
                    header: "addPosition",
                    onSave: (data) => {
                        positionsField.prepend(data as ReceiptPosition);
                        recalculateTotals();
                    },
                });
            } else if (args === "addFee") {
                const newFee = createDefaultModifier();
                openEditModalCommand$.next({
                    fieldType: "modifier",
                    modifierType: "fees",
                    initialValue: newFee,
                    header: "addFee",
                    onSave: (data) => {
                        feesField.prepend(data as ReceiptModifier);
                        recalculateTotals();
                    },
                });
            } else if (args === "addDiscount") {
                const newDiscount = createDefaultModifier();
                openEditModalCommand$.next({
                    fieldType: "modifier",
                    modifierType: "discounts",
                    initialValue: newDiscount,
                    header: "addDiscount",
                    onSave: (data) => {
                        discountsField.prepend(data as ReceiptModifier);
                        recalculateTotals();
                    },
                });
            }
        },
        [
            getValues,
            setValue,
            openEditModalCommand$,
            positionsField,
            feesField,
            discountsField,
        ]
    );

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
                .updateReceipt({
                    id: receiptId,
                    data: { ...data, editingFinished: true },
                })
                .then(() => {
                    typeRef.current = "splitting";
                    setValue("editingFinished" as keyof Receipt, true as never);
                    setForceUpdate((v) => v + 1);
                });
        } else if (type === "validation") {
            // Переход в editing mode
            typeRef.current = "editing";
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
            .updateReceipt({
                id: receiptId,
                data: { ...data, editingFinished: false },
            })
            .then(() => {
                typeRef.current = "editing";
                setValue("editingFinished" as keyof Receipt, false as never);
                setForceUpdate((v) => v + 1);
            });
    }, [type, getValues, receiptId, setValue]);

    // -------------------------------------------------------------------------
    // 8. canProceed Observable
    // -------------------------------------------------------------------------
    const canProceed$ = useMemo(() => of(formState.isValid), [formState.isValid]);

    // -------------------------------------------------------------------------
    // 9. Return state
    // -------------------------------------------------------------------------
    return {
        scenario: {
            type,
            form,
            canEdit: permissions[type],
        },
        canProceed$,
        proceed,
        goBackToEditing,
        openEditModal,
        openEditModalCommand$,
    };
}
