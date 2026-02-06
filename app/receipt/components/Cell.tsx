"use client";

import React from "react";
import { useFormContext, useWatch, FieldPath } from "react-hook-form";
import { ReceiptData } from "@/model/receipt/model";

interface CellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  name: FieldPath<ReceiptData>;
}

/**
 * Cell component that displays a value from react-hook-form.
 */
export const Cell: React.FC<CellProps> = ({ name, className = "", ...props }) => {
  const { formState } = useFormContext<ReceiptData>();
  const value = useWatch<ReceiptData>({ name });

  // Check if this field has errors
  const hasError = name.split(".").reduce((obj: unknown, key) => {
    if (obj && typeof obj === "object") {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, formState.errors) !== undefined;

  // Format value for display
  const displayValue = typeof value === "object" ? JSON.stringify(value) : value;

  return (
    <td className={`${className} ${hasError ? "text-red-500" : ""}`} {...props}>
      {displayValue}
    </td>
  );
};
