"use client";

import { t } from "@/app/i18n/translations";
import { CellGroup } from "@/app/receipt/components/CellGroup";
import React from "react";
import { Cell } from "./Cell";
import { FormArrayTitle } from "./FormArrayTitle";
import { useReceiptState } from "./ReceiptForm";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Receipt } from "@/model/receipt/model";

interface ModifiersProps {
  type: "discounts" | "fees";
}

export const Modifiers: React.FC<ModifiersProps> = ({ type }) => {
  const { control } = useFormContext<Receipt>();
  const { fields } = useFieldArray({ control, name: type });
  const ctx = useReceiptState();

  const openEditModal = ctx.scenario.canEdit.modifierForm
    ? () => ctx.openEditModal(type === "discounts" ? "addDiscount" : "addFee")
    : undefined;

  if (fields.length === 0) {
    return (
      <>
        <tr>
          <td>
            <FormArrayTitle title={t(type) + ":"} onAddClick={openEditModal} />
          </td>
          <td colSpan={3}>-</td>
        </tr>
      </>
    );
  }

  return (
    <>
      {fields.map((field, index) => (
        <CellGroup
          key={field.id}
          fieldPath={`${type}.${index}` as const}
          index={index}
          type="modifier"
          modifierType={type}
          canEdit={ctx.scenario.canEdit.modifierForm}
        >
          {(props) => (
            <>
              <tr>
                {index === 0 && (
                  <td rowSpan={fields.length * 2}>
                    <FormArrayTitle
                      title={t(type) + ":"}
                      onAddClick={openEditModal}
                    />
                  </td>
                )}
                <td colSpan={2} {...props}>
                  {t("modifierName")}
                </td>
                <Cell {...props} name={`${type}.${index}.name` as const} />
              </tr>
              <tr>
                <td colSpan={2} {...props}>
                  {t("modifierValue")}
                </td>
                <Cell
                  {...props}
                  name={`${type}.${index}.value` as const}
                  colSpan={2}
                />
              </tr>
            </>
          )}
        </CellGroup>
      ))}
    </>
  );
};
