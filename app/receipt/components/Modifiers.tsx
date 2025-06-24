import { t } from "@/app/i18n/translations";
import { ModifierForm } from "@/app/receipt/[id]/receipt-state";
import { CellGroup } from "@/app/receipt/components/CellGroup";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import React from "react";
import { Cell } from "./Cell";
import { FormArrayTitle } from "./FormArrayTitle";
import { useReceiptState } from "./ReceiptForm";

interface ItemsSectionProps {
  type: "discounts" | "fees";
  items: ModifierForm;
}

export const Modifiers: React.FC<ItemsSectionProps> = ({ type, items }) => {
  useObservable(items.valueChanges, forceSync);
  const ctx = useReceiptState();
  const openEditModal = () =>
    ctx.openEditModal(type === "discounts" ? "addDiscount" : "addFee");

  if (items.length === 0) {
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
      {items.controls.map((item, index) => (
        <CellGroup record={item} key={`${type}-${index}`}>
          {(props) => (
            <>
              <tr>
                {index === 0 && (
                  <td rowSpan={items.length * 2}>
                    <FormArrayTitle
                      title={t(type) + ":"}
                      onAddClick={openEditModal}
                    />
                  </td>
                )}
                <td colSpan={2} {...props}>
                  {t("modifierName")}
                </td>
                <Cell {...props} formControl={item.controls.name} />
              </tr>
              <tr>
                <td colSpan={2} {...props}>
                  {t("modifierValue")}
                </td>
                <Cell
                  {...props}
                  formControl={item.controls.value}
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
