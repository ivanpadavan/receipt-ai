import { ModifierForm } from "@/app/receipt/[id]/receipt-state";
import { CellGroup } from "@/app/receipt/components/CellGroup";
import React, { useContext } from "react";
import { Cell } from "./Cell";
import { FormArrayTitle } from "./FormArrayTitle";
import { t } from '@/app/i18n/translations';
import { ReceiptFormContext } from "./ReceiptForm";

interface ItemsSectionProps {
  type: 'discounts' | 'additions';
  items: ModifierForm | 'placeholder';
}

export const Modifiers: React.FC<ItemsSectionProps> = ({ type, items }) => {
  const _openEditModal = useContext(ReceiptFormContext)?.openEditModal;
  const openEditModal = () => _openEditModal && _openEditModal(type === 'discounts' ? 'addDiscount' : 'addAddition');

  if (items === 'placeholder') {
    return (
      <>
        <tr>
          <td>
            <FormArrayTitle title={t(type)} showColon={true} onAddClick={openEditModal} />
          </td>
          <td colSpan={3}>-</td>
        </tr>
      </>
    );
  }

  return (
    <>
      {items.controls.map((item, index) => (
        <CellGroup record={item} key={`${type}-${index}`} >{(props) => (<>
          <tr>
            {index === 0 && (
              <td rowSpan={items.length * 2}>
                <FormArrayTitle title={t(type)} showColon={true} onAddClick={openEditModal} />
              </td>
            )}
            <td {...props}>{t('modifierName')}</td>
            <Cell {...props} formControl={item.controls.name} colSpan={2} />
          </tr>
          <tr>
            <td {...props}>{t('modifierValue')}</td>
            <Cell {...props} formControl={item.controls.value} colSpan={2} />
          </tr>
        </>)}
        </CellGroup>
      ))}
    </>
  );
};
