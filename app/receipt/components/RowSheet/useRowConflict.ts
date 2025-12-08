import { useEffect, useState } from "react";
import deepEqual from "deep-eql";
import { AppendableForm, ReceiptForm } from "@/app/receipt/[id]/receipt-state";

interface UseRowConflictProps {
    formGroup: AppendableForm;
    initialValue: ReturnType<AppendableForm['getRawValue']> | undefined;
    getFormGroupCurrentState: (form: ReceiptForm) => AppendableForm | undefined;
    form: ReceiptForm;
}

export type ConflictType = 'deleted' | 'modified';

export interface ConflictState {
    type: ConflictType;
    message: string;
    serverValue?: ReturnType<AppendableForm['getRawValue']>;
}

export const useRowConflict = ({
    formGroup,
    initialValue,
    getFormGroupCurrentState,
    form
}: UseRowConflictProps) => {
    const [conflict, setConflict] = useState<ConflictState | null>(null);

    const resolveConflict = (action: 'accept' | 'keep') => {
        if (!conflict) return;

        if (action === 'accept' && conflict.serverValue) {
            formGroup.patchValue(conflict.serverValue);
        }
        // 'keep' action just clears the conflict (ignoring server update)
        setConflict(null);
    };

    useEffect(() => {
        if (!initialValue || !getFormGroupCurrentState) return;

        const liveControl = getFormGroupCurrentState(form);

        // Case 1: Deleted
        if (!liveControl) {
            setConflict({ type: 'deleted', message: 'Item has been deleted by another user.' });
            return;
        }

        const liveValue = liveControl.getRawValue();
        const currentLocalValue = formGroup.getRawValue();
        console.log('HOOK DEBUG:', { liveValue, initialValue, currentLocalValue });
        // Case 2: Modified
        if (!deepEqual(liveValue, initialValue) && !deepEqual(liveValue, currentLocalValue)) {

            // Auto-update if pristine
            if (deepEqual(currentLocalValue, initialValue)) {
                console.log('Auto-updating pristine form');
                formGroup.patchValue(liveValue);
                setConflict(null);
            } else if (deepEqual(currentLocalValue, liveValue)) {
                // Server state matches local user changes. Conflict is resolved.
                setConflict(null);
            } else {
                setConflict({
                    type: 'modified',
                    message: 'Item has been modified by another user.',
                    serverValue: liveValue
                });
            }
        } else {
            // If server state reverts to initial, clear conflict
            setConflict(null);
        }

    }, [form, initialValue, getFormGroupCurrentState, formGroup]);

    return { conflict, resolveConflict };
};
