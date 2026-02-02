import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Receipt, ReceiptPosition, ReceiptModifier } from "@/model/receipt/model";
import { isEqual } from "lodash-es";

type EditableValue = ReceiptPosition | ReceiptModifier | Receipt["totals"];

interface UseRowConflictProps<T extends EditableValue> {
  /** Current local value being edited */
  localValue: T;
  /** Initial value when the modal opened */
  initialValue: T;
  /** The main form to watch for external changes */
  form: UseFormReturn<Receipt>;
  /** Path to get current value from form state */
  getFormValue: (data: Receipt) => T | undefined;
}

export type ConflictType = 'deleted' | 'modified';

export interface ConflictState<T> {
  type: ConflictType;
  message: string;
  serverValue?: T;
}

/**
 * Hook to detect and handle conflicts when editing receipt data
 * while another user modifies the same data.
 */
export const useRowConflict = <T extends EditableValue>({
  localValue,
  initialValue,
  form,
  getFormValue,
}: UseRowConflictProps<T>) => {
  const [conflict, setConflict] = useState<ConflictState<T> | null>(null);

  useEffect(() => {
    const subscription = form.watch((formData) => {
      if (!formData) return;

      const liveValue = getFormValue(formData as Receipt);

      // Case 1: Deleted
      if (!liveValue) {
        setConflict({ type: 'deleted', message: 'Item has been deleted by another user.' });
        return;
      }

      // Case 2: Modified externally
      if (
        !isEqual(liveValue, initialValue) &&
        !isEqual(liveValue, localValue)
      ) {
        // Check if local changes match server — no conflict
        if (isEqual(localValue, liveValue)) {
          setConflict(null);
        } else {
          setConflict({
            type: "modified",
            message: "Item has been modified by another user.",
            serverValue: liveValue,
          });
        }
      } else {
        // No conflict
        setConflict(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, initialValue, localValue, getFormValue]);

  const resolveConflict = (action: 'accept' | 'keep') => {
    if (!conflict) return null;

    if (action === 'accept' && conflict.serverValue) {
      setConflict(null);
      return conflict.serverValue; // Return the server value to apply
    }

    // 'keep' action just clears the conflict (ignoring server update)
    setConflict(null);
    return null;
  };

  return { conflict, resolveConflict };
};
