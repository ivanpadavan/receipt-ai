"use client";

import React from "react";
import { t } from "@/app/i18n/translations";
import { ReceiptModifier } from "@/model/receipt/model";
import { useReceiptState } from "@/app/receipt/components/ReceiptForm";
import { useWatch } from "react-hook-form";
import { formatMoney } from "@/app/receipt/utils/formatMoney";
import { hasFormPathError } from "@/app/receipt/utils/hasFormPathError";
import { cn } from "@/utils/cn";
import {
  interactiveRowVariants,
  modifierValueVariants,
  rowVariants,
  stackGapVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";

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
  if (items.length === 0) return null;

  const canEdit = scenario.canEdit.modifierForm;
  const sign = type === "discounts" ? "-" : "+";

  return (
    <div className="mt-2">
      <div
        className={cn(
          "mb-1",
          textVariants({ size: "sm", tone: "muted" }),
        )}
      >
        {t(type)}:
      </div>
      <div className={stackGapVariants({ size: "xs" })}>
        {items.map((item, index) => {
          const hasValueError = hasFormPathError(errors, `${type}.${index}.value`);

          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                rowVariants({
                  align: "center",
                  justify: "between",
                  width: "full",
                }),
                interactiveRowVariants({ interactive: canEdit }),
              )}
              onClick={() =>
                canEdit &&
                openEditModal({
                  type: "modifier",
                  modifierType: type,
                  index,
                })
              }
            >
              <span className={textVariants({ tone: "muted" })}>
                {item.name || t("modifierName")}
              </span>
              <span
                className={modifierValueVariants({
                  tone: hasValueError
                    ? "danger"
                    : type === "discounts"
                      ? "success"
                      : "default",
                })}
              >
                {sign} {formatMoney(item.value)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
