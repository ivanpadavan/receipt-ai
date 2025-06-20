"use client";

import { t } from "@/app/i18n/translations";
import {
  EditModalProps,
  receiptFormState$,
  ReceiptState,
} from "@/app/receipt/[id]/receipt-state";
import { useModal } from "@/components/ui/modal/ModalContext";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { Receipt } from "@/model/receipt/model";
import React, { createContext, useCallback, useMemo } from "react";
import { Cell } from "./Cell";
import { CellGroup } from "./CellGroup";
import styles from "./form.module.css";
import { FormArrayTitle } from "./FormArrayTitle";
import { Modifiers } from "./Modifiers";
import { RowDrawer } from "./RowDrawer";

interface EditableReceiptFormProps {
  initialData: Receipt;
}

export const ReceiptFormContext = createContext<ReceiptState | null>(null);

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({
  initialData,
}) => {
  // Subscribe to the receipt state
  const { showModal } = useModal();
  const openEditModalCb = useCallback(
    (props: EditModalProps) => showModal(<RowDrawer {...props} />),
    [showModal],
  );

  const formState = useObservable(
    useMemo(
      () => receiptFormState$(initialData, openEditModalCb),
      [initialData, openEditModalCb],
    ),
    forceSync,
  );

  const {
    scenario: { form },
    openEditModal,
  } = formState;

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
            <tr>
              <td colSpan={3}>{t("total")}</td>
              <Cell
                formControl={form.controls.total.controls.positionsTotal}
                className="font-bold"
              />
            </tr>
            <Modifiers
              type={"discounts"}
              items={form.controls.total.controls.discounts}
            />
            <Modifiers
              type={"additions"}
              items={form.controls.total.controls.additions}
            />
            <tr>
              <td colSpan={3}>{t("grandTotal")}</td>
              <Cell
                formControl={form.controls.total.controls.total}
                className="font-bold"
              />
            </tr>
          </tfoot>
        </table>
      </div>
    </ReceiptFormContext.Provider>
  );
};
