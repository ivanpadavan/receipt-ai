import { useEffect, useState } from "react";
import { FieldPath, UseFormReturn } from "react-hook-form";
import {
  Receipt,
  ReceiptMeta,
  ReceiptPosition,
  ReceiptModifier,
} from "@/model/receipt/model";
import { isEqual } from "lodash-es";
import { t } from "@/app/i18n/translations";

type EditableValue =
  | ReceiptPosition
  | ReceiptModifier
  | Receipt["totals"]
  | ReceiptMeta;

interface UseRowConflictProps<T extends EditableValue> {
  /** Current local value being edited */
  localValue: T;
  /** Change current local value being edited */
  setLocalValue: (v: T) => void;
  /** Initial value when the modal opened */
  initialValue: T;
  /** The main form to watch for external changes */
  form: UseFormReturn<Receipt>;
  /** Path to get current value from form state */
  fieldPath?: FieldPath<Receipt>;
}

export type ConflictType = "deleted" | "modified";

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
  setLocalValue,
  initialValue,
  form,
  fieldPath,
}: UseRowConflictProps<T>) => {
  const [conflict, setConflict] = useState<ConflictState<T> | null>(null);

  useEffect(() => {
    if (!fieldPath) return;
    const subscription = form.watch((formData) => {
      if (!formData) return;
      const liveValue = fieldPath.split(".").reduce<unknown>((acc, key) => {
        if (acc && typeof acc === "object") {
          return (acc as Record<string, unknown>)[key];
        }
        return undefined;
      }, formData) as T | undefined;

      // Case 1: Deleted
      if (!liveValue) {
        setConflict({
          type: "deleted",
          message: t("conflictItemDeleted"),
        });
        return;
      }

      // Case 2: If form is pristine - apply server notification without notice
      if (isEqual(localValue, initialValue)) {
        setLocalValue(liveValue);
        setConflict(null);
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
            message: t("conflictItemModified"),
            serverValue: liveValue,
          });
        }
      } else {
        // No conflict
        setConflict(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, initialValue, localValue, fieldPath]);

  const resolveConflict = (action: "accept" | "keep") => {
    if (!conflict) return null;

    if (action === "accept" && conflict.serverValue) {
      setConflict(null);
      return conflict.serverValue; // Return the server value to apply
    }

    // 'keep' action just clears the conflict (ignoring server update)
    setConflict(null);
    return null;
  };

  return { conflict, resolveConflict };
};
