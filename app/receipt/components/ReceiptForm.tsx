"use client";

import { t } from "@/app/i18n/translations";
import {
  EditModalProps,
  useReceiptFormState,
  ReceiptState,
} from "@/app/receipt/[id]/useReceiptFormState";
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
import { EditingSheet } from "@/app/receipt/components/EdititngSheet/EditingSheet";
import { SplittingSheet } from "@/app/receipt/components/SplittingSheet/SplittingSheet";
import { ParticipantsSheet, ParticipantsBadge } from "@/app/receipt/components/ParticipantsSheet";
import { distinctUntilChanged, Observable, startWith } from "rxjs";
import { receiptSchema } from "@/model/receipt/schema";
import { Drawer } from "@/components/ui/drawer";
import { isEqual } from "lodash-es";
import { FormProvider, useFieldArray } from "react-hook-form";
import { Pencil } from "lucide-react";

interface EditableReceiptFormProps {
  initialData: Receipt;
  receiptId: string;
}

const ReceiptFormContext = createContext<ReceiptState | null>(null);

export const useReceiptState = (): ReceiptState => {
  const ctx = useContext(ReceiptFormContext);
  if (ctx === null) {
    throw new Error("should be provided");
  }
  return ctx;
};

const useReceiptWithUpdates = (initialData: Receipt, receiptId: string) => {
  return useObservable<Observable<Receipt>>(
    useMemo(() => {
      return new Observable<Receipt>((handler) => {
        if (typeof window === "undefined") {
          handler.next(initialData);
          handler.complete();
          return;
        }

        const eventSource = new EventSource(`/api/receipt/${receiptId}`);

        eventSource.onopen = () => {
          console.log("SSE connected");
        };

        eventSource.onmessage = (event) => {
          const { data, success } = receiptSchema.safeParse(
            JSON.parse(event.data)
          );
          console.log(event, data, success);
          if (success) {
            handler.next(data);
          }
        };

        // TODO indication that connection is lost
        eventSource.onerror = () =>
          handler.error(new Error("sse disconnected"));

        return () => eventSource.close();
      }).pipe(startWith(initialData), distinctUntilChanged(isEqual));
    }, [receiptId, initialData]),
    forceSync
  );
};

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({
  initialData,
  receiptId,
}) => {
  // Subscribe to the receipt state with SSE updates
  const receipt = useReceiptWithUpdates(initialData, receiptId);

  // Use the new react-hook-form based state
  const formState = useReceiptFormState(receipt, receiptId);

  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);

  const {
    scenario: { form, canEdit, type: scenarioType },
    openEditModal,
    closeModal,
    proceed,
    goBackToEditing,
    canProceed,
    editModalProps,
  } = formState;

  // Get field array for positions
  const { fields: positionFields } = useFieldArray({
    control: form.control,
    name: "positions",
  });

  return (
    <ReceiptFormContext.Provider value={formState}>
      <FormProvider {...form}>
        {/* Edit Modal Drawer */}
        <Drawer
          onCloseAnimationEnd={() => closeModal()}
          open={!!editModalProps}
        >
          {editModalProps &&
            (scenarioType === "splitting" ? (
              <SplittingSheet {...editModalProps} />
            ) : (
              <EditingSheet {...editModalProps} />
            ))}
        </Drawer>

        {/* Participants Modal Drawer */}
        <Drawer
          open={participantsModalOpen}
          onClose={() => setParticipantsModalOpen(false)}
        >
          <ParticipantsSheet onClose={() => setParticipantsModalOpen(false)} />
        </Drawer>
        <div className="m-3 rounded bg-white shadow-md text-black max-w-fit w-full mx-auto overflow-auto font-mono">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <FormArrayTitle
                    title={t("name")}
                    onAddClick={
                      canEdit.positionForm === true
                        ? () => openEditModal("addPosition")
                        : undefined
                    }
                  />
                </th>
                <th className="text-center">{t("price")}</th>
                <th className="text-center">{t("quantity")}</th>
                <th className="text-center">{t("overall")}</th>
              </tr>
            </thead>
            <tbody>
              {positionFields.map((field, index) => (
                <CellGroup
                  key={field.id}
                  fieldPath={`positions.${index}`}
                  index={index}
                  type="position"
                  canEdit={canEdit.positionForm}
                >
                  {({ className, ...props }) => (
                    <tr className={className + " border-b border-gray-200"}>
                      <Cell {...props} name={`positions.${index}.name`} />
                      <Cell {...props} name={`positions.${index}.price`} />
                      <Cell {...props} name={`positions.${index}.quantity`} />
                      <Cell {...props} name={`positions.${index}.overall`} />
                    </tr>
                  )}
                </CellGroup>
              ))}
            </tbody>
            <tfoot>
              <tr
                onClick={() =>
                  canEdit.totalsForm && openEditModal({ type: "totals" })
                }
                className={
                  canEdit.totalsForm ? "cursor-pointer hover:bg-gray-100" : ""
                }
              >
                <td colSpan={3}>{t("total")}</td>
                <Cell name="totals.total" className="font-bold" />
              </tr>
              <Modifiers type="discounts" />
              <Modifiers type="fees" />
              <tr
                onClick={() =>
                  canEdit.totalsForm && openEditModal({ type: "totals" })
                }
                className={
                  canEdit.totalsForm ? "cursor-pointer hover:bg-gray-100" : ""
                }
              >
                <td colSpan={3}>{t("grandTotal")}</td>
                <Cell name="totals.grandTotal" className="font-bold" />
              </tr>
            </tfoot>
          </table>
          <div className="flex justify-end items-center gap-3 mt-4 mb-2 mr-4 ml-4">
            {scenarioType === "splitting" && (
              <>
                <Button variant="outline" onClick={goBackToEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("edit")}
                </Button>
                <ParticipantsBadge
                  onClick={() => setParticipantsModalOpen(true)}
                />
              </>
            )}
            <Button onClick={proceed} disabled={!canProceed}>
              {t("proceed")}
            </Button>
          </div>
        </div>
      </FormProvider>
    </ReceiptFormContext.Provider>
  );
};
