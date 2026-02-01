"use client";

import { useState } from "react";
import { useFormContext, FieldPath } from "react-hook-form";
import { Receipt } from "@/model/receipt/model";
import { useReceiptState } from "./ReceiptForm";

interface CellGroupProps {
  /** Field path prefix for this group (e.g., "positions.0") */
  fieldPath: FieldPath<Receipt>;
  /** Index in the array (for positions, fees, discounts) */
  index: number;
  /** Type of the group */
  type: "position" | "modifier";
  /** For modifiers: which array */
  modifierType?: "fees" | "discounts";
  /** Edit permissions */
  canEdit: boolean | "splitting";
  /** Render function */
  children: (props: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: () => void;
    className: string;
  }) => React.ReactNode;
}

/**
 * CellGroup component for react-hook-form.
 * Handles hover states and click-to-edit functionality.
 */
export const CellGroup = ({
  fieldPath,
  index,
  type,
  modifierType,
  canEdit,
  children,
}: CellGroupProps) => {
  const { formState } = useFormContext<Receipt>();
  const [hoverWithin, setHoverWithin] = useState(false);
  const { openEditModal } = useReceiptState();

  // Check if this field path has errors
  const hasError = fieldPath.split(".").reduce((obj: unknown, key) => {
    if (obj && typeof obj === "object") {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, formState.errors) !== undefined;

  const handleClick = () => {
    if (!canEdit) return;

    if (type === "position") {
      openEditModal({ type: "position", index });
    } else if (type === "modifier" && modifierType) {
      openEditModal({ type: "modifier", modifierType, index });
    }
  };

  const props = {
    onMouseEnter: () => canEdit && setHoverWithin(true),
    onMouseLeave: () => canEdit && setHoverWithin(false),
    onClick: handleClick,
    className:
      (hasError ? "bg-red-50 " : "") +
      (canEdit && hoverWithin ? "cursor-pointer bg-gray-100 " : ""),
  };

  return children(props);
};
