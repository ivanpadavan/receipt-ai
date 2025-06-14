"use client";

import { useModal } from "@/components/ui/modal/ModalContext";
import { useObservableFactory } from "@/hooks/useObservableFactory";
import React, { createContext, useCallback } from "react";
import { Receipt } from '@/model/receipt/model';
import {
  ReceiptState,
  receiptFormState$, EditModalProps
} from "@/app/receipt/[id]/receipt-state";
import styles from './form.module.css'
import { Modifiers } from './Modifiers';
import { Cell } from './Cell';
import { CellGroup } from './CellGroup';
import { FormArrayTitle } from './FormArrayTitle';
import { RowDrawer } from './RowDrawer';
import { t } from '@/app/i18n/translations';

interface EditableReceiptFormProps {
  initialData: Receipt;
}

export const ReceiptFormContext = createContext<ReceiptState | null>(null);

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({ initialData }) => {
  // Subscribe to the receipt state
  const { showModal } = useModal();
  const openEditModalCb = useCallback(((props: EditModalProps) => showModal(<RowDrawer {...props} />)), [showModal]);
  const [formState] = useObservableFactory(receiptFormState$, [initialData, openEditModalCb]);

  const { scenario: { form }, openEditModal } = formState;

  return (
    <ReceiptFormContext.Provider value={formState} >
    <div className="m-3 rounded bg-white shadow-md text-black max-w-fit w-full mx-auto overflow-auto font-mono">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>
              <FormArrayTitle title={t('name')} onAddClick={() => openEditModal('addPosition')} />
            </th>
            <th className="text-center">{t('price')}</th>
            <th className="text-center">{t('quantity')}</th>
            <th className="text-center">{t('overall')}</th>
          </tr>
        </thead>
        <tbody>
          {form.controls.positions.controls.map((position, index) => (
            <CellGroup key={'positions' + index} record={position}>{({ className, ...props }) => (
              <tr className={className + ' border-b border-gray-200'}>
                <Cell {...props} formControl={position.controls.name} />
                <Cell {...props} formControl={position.controls.price} />
                <Cell {...props} formControl={position.controls.quantity} />
                <Cell {...props} formControl={position.controls.overall} />
              </tr>
            )}
            </CellGroup>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>{t('total')}</td>
            <Cell formControl={form.controls.total.controls.positionsTotal} className="font-bold" />
          </tr>
          <Modifiers type={'discounts'} items={form.controls.total.controls.discounts} />
          <Modifiers type={'additions'} items={form.controls.total.controls.additions} />
          <tr>
            <td colSpan={3}>{t('grandTotal')}</td>
            <Cell formControl={form.controls.total.controls.total} className="font-bold" />
          </tr>
        </tfoot>
      </table>
    </div>
  </ReceiptFormContext.Provider>);
};
