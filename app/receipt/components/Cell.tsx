"use client";

import React from "react";
import { useFormContext, useWatch, FieldPath } from "react-hook-form";
import { Receipt } from "@/model/receipt/model";
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const cellVariants = cva("", {
  variants: {
    tone: {
      default: "",
      danger: "text-red-500",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

interface CellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  name: FieldPath<Receipt>;
}

/**
 * Cell component that displays a value from react-hook-form.
 */
export const Cell: React.FC<CellProps> = ({
  name,
  className = "",
  ...props
}) => {
  const { formState } = useFormContext<Receipt>();
  const value = useWatch<Receipt>({ name });

  // Check if this field has errors
  const hasError =
    name.split(".").reduce((obj: unknown, key) => {
      if (obj && typeof obj === "object") {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, formState.errors) !== undefined;

  // Format value for display
  const displayValue =
    typeof value === "object" ? JSON.stringify(value) : value;

  return (
    <td
      className={cn(
        className,
        cellVariants({ tone: hasError ? "danger" : "default" }),
      )}
      {...props}
    >
      {displayValue}
    </td>
  );
};
