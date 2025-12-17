import { useEffect, useState } from "react";
import { EditableForm, ReceiptForm } from "@/app/receipt/[id]/receipt-state";
import { isEqual } from "lodash-es";

interface UseRowConflictProps {
    formGroup: EditableForm;
    initialValue: ReturnType<EditableForm['getRawValue']> | undefined;
    getFormGroupCurrentState: (form: ReceiptForm) => EditableForm | undefined;
    form: ReceiptForm;
}

export type ConflictType = 'deleted' | 'modified';

export interface ConflictState {
    type: ConflictType;
    message: string;
    serverValue?: ReturnType<EditableForm['getRawValue']>;
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
          // eslint-disable-next-line react-hooks/set-state-in-effect
            setConflict({ type: 'deleted', message: 'Item has been deleted by another user.' });
            return;
        }

        const liveValue = liveControl.getRawValue();
        const currentLocalValue = formGroup.getRawValue();
        console.log('HOOK DEBUG:', { liveValue, initialValue, currentLocalValue });
        // Case 2: Modified
        if (
          !isEqual(liveValue, initialValue) &&
          !isEqual(liveValue, currentLocalValue)
        ) {
          // Auto-update if pristine
          if (isEqual(currentLocalValue, initialValue)) {
            console.log("Auto-updating pristine form");
            formGroup.patchValue(liveValue);
            setConflict(null);
          } else if (isEqual(currentLocalValue, liveValue)) {
            // Server state matches local user changes. Conflict is resolved.
            setConflict(null);
          } else {
            setConflict({
              type: "modified",
              message: "Item has been modified by another user.",
              serverValue: liveValue,
            });
          }
        } else {
          // If server state reverts to initial, clear conflict
          setConflict(null);
        }

    }, [form, initialValue, getFormGroupCurrentState, formGroup]);

    return { conflict, resolveConflict };
};
