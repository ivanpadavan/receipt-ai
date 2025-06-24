"use client";

import { t } from "@/app/i18n/translations";
import {
  EditModalProps,
  receiptFormState$,
  ReceiptState,
} from "@/app/receipt/[id]/receipt-state";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/ModalContext";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { Receipt } from "@/model/receipt/model";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import { Cell } from "./Cell";
import { CellGroup } from "./CellGroup";
import styles from "./form.module.css";
import { FormArrayTitle } from "./FormArrayTitle";
import { Modifiers } from "./Modifiers";
import { RowDrawer } from "./RowDrawer";

interface EditableReceiptFormProps {
  initialData: Receipt;
  receiptId: string;
}

const ReceiptFormContext = createContext<ReceiptState | null>(null);

export const useReceiptState = (): ReceiptState => {
  const ctx = useContext(ReceiptFormContext);
  if (ctx === null) {
    throw new Error('should be provided');
  }
  return ctx;
}

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({
  initialData,
  receiptId,
}) => {
  // Subscribe to the receipt state
  const { showModal } = useModal();
  const openEditModalCb = useCallback(
    (props: EditModalProps) => showModal(<RowDrawer {...props} />),
    [showModal],
  );

  const formState = useObservable(
    useMemo(
      () => receiptFormState$(initialData, openEditModalCb, receiptId),
      [initialData, openEditModalCb, receiptId],
    ),
    forceSync,
  );

  const {
    scenario: { form },
    openEditModal,
    proceed,
    canProceed$,
  } = formState;

  const canProceed = useObservable(canProceed$, forceSync);

  return (
    <ReceiptFormContext.Provider value={formState}>
      <div className="m-3 rounded bg-white shadow-md text-black max-w-fit w-full mx-auto overflow-auto font-mono">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <FormArrayTitle
                  title={t("name")}
                  onAddClick={() => openEditModal("addPosition")}
                />
              </th>
              <th className="text-center">{t("price")}</th>
              <th className="text-center">{t("quantity")}</th>
              <th className="text-center">{t("overall")}</th>
            </tr>
          </thead>
          <tbody>
            {form.controls.positions.controls.map((position, index) => (
              <CellGroup key={"positions" + index} record={position}>
                {({ className, ...props }) => (
                  <tr className={className + " border-b border-gray-200"}>
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
            <tr onClick={() => openEditModal(form.controls.total.controls.totals)}>
              <td colSpan={3}>{t("total")}</td>
              <Cell
                formControl={form.controls.total.controls.totals.controls.positionsTotal}
                className="font-bold"
              />
            </tr>
            <Modifiers
              type={"discounts"}
              items={form.controls.total.controls.discounts}
            />
            <Modifiers
              type={"fees"}
              items={form.controls.total.controls.fees}
            />
            <tr onClick={() => openEditModal(form.controls.total.controls.totals)}>
              <td colSpan={3}>{t("grandTotal")}</td>
              <Cell
                formControl={form.controls.total.controls.totals.controls.total}
                className="font-bold"
              />
            </tr>
          </tfoot>
        </table>
        <div className="flex justify-end mt-4 mb-2 mr-4">
          <Button
            onClick={proceed}
            disabled={!canProceed}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {t("proceed")}
          </Button>
        </div>
      </div>
    </ReceiptFormContext.Provider>
  );
};
