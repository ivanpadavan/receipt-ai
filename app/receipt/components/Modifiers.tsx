"use client";

import React from "react";
import { t } from "@/app/i18n/translations";
import { ReceiptModifier } from "@/model/receipt/model";
import { useReceiptState } from "@/app/receipt/components/ReceiptForm";
import { useWatch } from "react-hook-form";
import { formatMoney } from "@/app/receipt/utils/formatMoney";
import { hasFormPathError } from "@/app/receipt/utils/hasFormPathError";

interface ModifiersProps {
  type: "discounts" | "fees";
}

export const Modifiers: React.FC<ModifiersProps> = ({ type }) => {
  const { scenario, openEditModal } = useReceiptState();
  const { errors } = scenario.form.formState;
  const items =
    (useWatch({
      control: scenario.form.control,
      name: type,
    }) as ReceiptModifier[]) || [];
  const canEdit = scenario.canEdit.modifierForm;
  const sign = type === "discounts" ? "-" : "+";

  return (
    <div className="mt-2">
      <div className="mb-1 text-sm text-muted-foreground">{t(type)}:</div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">-</div>
      ) : (
        <div className="space-y-1">
          {items.map((item, index) => {
            const hasValueError = hasFormPathError(
              errors,
              `${type}.${index}.value`,
            );

            return (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-1 py-1 text-sm ${
                canEdit ? "cursor-pointer hover:bg-muted/45" : "cursor-default"
              }`}
              onClick={() =>
                canEdit &&
                openEditModal({
                  type: "modifier",
                  modifierType: type,
                  index,
                })
              }
            >
              <span className="text-muted-foreground">
                {item.name || t("modifierName")}
              </span>
              <span
                className={
                  hasValueError
                    ? "font-medium text-destructive"
                    : type === "discounts"
                    ? "font-medium text-emerald-600"
                    : "font-medium"
                }
              >
                {sign} {formatMoney(item.value)}
              </span>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
