"use client";

import { FormGroup } from "@/forms/form_group";
import { useObservableFactory } from "@/hooks/useObservableFactory";
import { IonPage } from "@ionic/react";
import React, { createContext, useContext, useMemo } from "react";
import { Receipt } from '@/model/receipt/model';
import { ReceiptState, receiptFormState$ } from "@/app/receipt/[id]/receipt-state";
import styles from './form.module.css'
import { Modifiers } from './Modifiers';
import { Cell } from './Cell';
import { CellGroup } from './CellGroup';
import { FormArrayTitle } from './FormArrayTitle';
import { ModalProvider, useModal } from './ModalContext';
import { RowModal } from './RowModal';

interface EditableReceiptFormProps {
  initialData: Receipt;
}

export const ReceiptFormContext = createContext<ReceiptState | null>(null);

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({ initialData }) => {
  // Subscribe to the receipt state
  const [formState] = useObservableFactory(receiptFormState$, initialData);

  return (
    <ReceiptFormContext.Provider value={formState}>
      <ModalProvider>
        <ReceiptFormContent />
      </ModalProvider>
    </ReceiptFormContext.Provider>
  );
};

// Inner component that uses the modal context
const ReceiptFormContent: React.FC = () => {
  const formState = useContext(ReceiptFormContext);
  const { showModal } = useModal();

  // We need to handle the null case in the render function to avoid conditional hooks
  const form = formState?.scenario?.form;
  const onRowClick = formState?.onRowClick;

  // Handle row click to show modal
  const handleRowClick = (row: FormGroup) => {
    if (onRowClick) {
      showModal(<RowModal row={row} />);
      onRowClick(row);
    }
  };

  // Create a new context value with the handleRowClick function
  const contextValue = useMemo(() => {
    if (!formState) return null;
    return {
      ...formState,
      onRowClick: handleRowClick
    };
  }, [formState, handleRowClick]);

  // Calculate derived state - these hooks will always run
  const discounts = useMemo(() => {
    if (!form) return 'placeholder';
    return form.controls.total.controls.discounts.length > 0
      ? form.controls.total.controls.discounts
      : 'placeholder';
  }, [form]);

  const additions = useMemo(() => {
    if (!form) return 'placeholder';
    return form.controls.total.controls.additions.length > 0
      ? form.controls.total.controls.additions
      : 'placeholder';
  }, [form]);

  // If no form state, render nothing
  if (!form || !contextValue) return null;

  return (
    <ReceiptFormContext.Provider value={contextValue}>
    <div className="m-3 rounded bg-white shadow-md text-black overflow-hidden max-w-fit mx-auto">
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
