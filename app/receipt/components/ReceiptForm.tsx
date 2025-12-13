"use client";

import { t } from "@/app/i18n/translations";
import {
  EditModalProps,
  receiptFormState$,
  ReceiptState,
} from "@/app/receipt/[id]/receipt-state";
import { Button } from "@/components/ui/button";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { Receipt } from "@/model/receipt/model";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Cell } from "./Cell";
import { CellGroup } from "./CellGroup";
import styles from "./form.module.css";
import { FormArrayTitle } from "./FormArrayTitle";
import { Modifiers } from "./Modifiers";
import { RowSheet } from "./RowSheet/RowSheet";
import deepEqual from "deep-eql";
import { distinctUntilChanged, Observable, startWith } from "rxjs";
import { receiptSchema } from "@/model/receipt/schema";
import { Drawer } from "@/components/ui/drawer";

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

const useReceiptWithUpdates = (initialData: Receipt, receiptId: string) => {
  return useObservable<Observable<Receipt>>(useMemo(() => {
    return new Observable<Receipt>((handler) => {
      if (typeof window === 'undefined') {
        handler.next(initialData);
        handler.complete();
        return;
      }

      const eventSource = new EventSource(`/api/receipt/${receiptId}`);

      eventSource.onopen = () => {
        console.log("SSE connected");
      };

      eventSource.onmessage = (event) => {
        const { data, success } = receiptSchema.safeParse(JSON.parse(event.data));
        console.log(event, data, success);
        if (success) {
          handler.next(data);
        }
      }

      // TODO indication that connection is lost
      eventSource.onerror = () => handler.error(new Error('sse disconnected'));

      return () => eventSource.close();
    }).pipe(
      startWith(initialData),
      distinctUntilChanged(deepEqual),
    )
  }, [receiptId, initialData]), forceSync);
}

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({
  initialData,
  receiptId,
}) => {
  // Subscribe to the receipt state

  const receipt = useReceiptWithUpdates(initialData, receiptId);

  const formState = useObservable(
    useMemo(
      () => receiptFormState$(receipt, receiptId),
      [receipt, receiptId],
    ),
    forceSync,
  );

  const [activeModalProps, setActiveModalProps] = React.useState<null | EditModalProps>(null);

  useEffect(() => {
    const sub = formState.openEditModalCommand$.subscribe((props) => setActiveModalProps(props));
    return () => sub.unsubscribe();
  }, [formState]);

  const {
    scenario: { form, canEdit },
    openEditModal,
    proceed,
    canProceed$,
  } = formState;

  const canProceed = useObservable(canProceed$, forceSync);

  return (
    <ReceiptFormContext.Provider value={formState}>
      <Drawer onCloseAnimationEnd={() => setActiveModalProps(null)} open={!!activeModalProps}>
        {activeModalProps && <RowSheet {...activeModalProps} />}
      </Drawer>
      <div className="m-3 rounded bg-white shadow-md text-black max-w-fit w-full mx-auto overflow-auto font-mono">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <FormArrayTitle
                  title={t("name")}
                  onAddClick={formState.scenario.canEdit.positionForm === true ? () => openEditModal("addPosition") : undefined}
                />
              </th>
              <th className="text-center">{t("price")}</th>
              <th className="text-center">{t("quantity")}</th>
              <th className="text-center">{t("overall")}</th>
            </tr>
          </thead>
          <tbody>
            {form.controls.positions.controls.map((position, index) => (
              <CellGroup key={"positions" + index} record={position} canEdit={canEdit.positionForm}>
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
            <tr
              onClick={() => canEdit.totalsForm && openEditModal(form.controls.totals)}
              className={canEdit.totalsForm ? "cursor-pointer hover:bg-gray-100" : ""}
            >
              <td colSpan={3}>{t("total")}</td>
              <Cell
                formControl={form.controls.totals.controls.total}
                className="font-bold"
              />
            </tr>
            <Modifiers
              type={"discounts"}
              items={form.controls.discounts}
            />
            <Modifiers
              type={"fees"}
              items={form.controls.fees}
            />
            <tr
              onClick={() => canEdit.totalsForm && openEditModal(form.controls.totals)}
              className={canEdit.totalsForm ? "cursor-pointer hover:bg-gray-100" : ""}
            >
              <td colSpan={3}>{t("grandTotal")}</td>
              <Cell
                formControl={form.controls.totals.controls.grandTotal}
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
