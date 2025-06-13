"use client";

import { useModal } from "@/components/ui/modal/ModalContext";
import { FormGroup } from "@/forms/form_group";
import { useObservableFactory } from "@/hooks/useObservableFactory";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import { Receipt } from '@/model/receipt/model';
import { ReceiptState, receiptFormState$ } from "@/app/receipt/[id]/receipt-state";
import styles from './form.module.css'
import { Modifiers } from './Modifiers';
import { Cell } from './Cell';
import { CellGroup } from './CellGroup';
import { FormArrayTitle } from './FormArrayTitle';
import { RowModal } from './RowModal';

interface EditableReceiptFormProps {
  initialData: Receipt;
}

export const ReceiptFormContext = createContext<ReceiptState | null>(null);

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({ initialData }) => {
  // Subscribe to the receipt state
  const { showModal } = useModal();
  const openEditModal = useCallback((row: FormGroup) => showModal(<RowModal row={row} />), [showModal]);

  const [formState] = useObservableFactory(receiptFormState$, [initialData, openEditModal]);
  const { scenario: { form } } = formState;
  const discounts = useMemo(() => form.controls.total.controls.discounts.length > 0 ? form.controls.total.controls.discounts : 'placeholder', [form]);
  const additions = useMemo(() => form.controls.total.controls.additions.length > 0 ? form.controls.total.controls.additions : 'placeholder', [form]);

  return (
    <ReceiptFormContext.Provider value={formState} >
    <div className="m-3 rounded bg-white shadow-md text-black max-w-fit w-full mx-auto overflow-auto">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>
              <FormArrayTitle title="Наименование" />
            </th>
            <th className="text-center">Сумма</th>
            <th className="text-center">Количество</th>
            <th className="text-center">Сумма</th>
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
            <td colSpan={3}>Итого:</td>
            <Cell formControl={form.controls.total.controls.positionsTotal} className="font-bold" />
          </tr>
          <Modifiers title="Скидки" items={discounts} />
          <Modifiers title="Сборы" items={additions} />
          <tr>
            <td colSpan={3}>С учетом скидок и сборов:</td>
            <Cell formControl={form.controls.total.controls.total} className="font-bold" />
          </tr>
        </tfoot>
      </table>
    </div>
  </ReceiptFormContext.Provider>);
};
