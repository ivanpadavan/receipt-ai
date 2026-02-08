"use client";

import { t, TranslationKey } from "@/app/i18n/translations";
import {
  EditModalProps,
  ReceiptState,
  useReceiptFormState,
} from "@/app/receipt/[id]/useReceiptFormState";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { Receipt, ReceiptWithParticipants } from "@/model/receipt/model";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { EditingDialog } from "@/app/receipt/components/EdititngSheet/EditingDialog";
import { SplittingSheet } from "@/app/receipt/components/SplittingSheet/SplittingSheet";
import { ParticipantsSheet } from "@/app/receipt/components/ParticipantsSheet";
import { SummaryScreen } from "@/app/receipt/components/SummaryScreen/SummaryScreen";
import {
  distinctUntilChanged,
  finalize,
  fromEvent,
  merge,
  Observable,
  retry,
  startWith,
  take,
  timer,
} from "rxjs";
import { receiptWithParticipantsSchema } from "@/model/receipt/schema";
import { Drawer } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { isEqual } from "lodash-es";
import { FormProvider, useWatch } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Modifiers } from "@/app/receipt/components/Modifiers";
import { formatMoney } from "@/app/receipt/utils/formatMoney";
import {
  getFormPathErrorMessage,
  hasFormPathError,
} from "@/app/receipt/utils/hasFormPathError";
import {
  ParticipantsStoreProvider,
  useParticipantsStore,
} from "@/app/receipt/store/participants";
import { useJoinFlowOverlay } from "@/app/receipt/[id]/join-flow/use-join-flow-overlay";
import { ReceiptActionBar } from "@/app/receipt/components/ReceiptActionBar";
import { DistributionBar } from "@/app/receipt/components/SplittingSheet/DistributionBar";

interface EditableReceiptFormProps {
  initialData: ReceiptWithParticipants;
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

const useReceiptWithUpdates = (
  initialData: ReceiptWithParticipants,
  receiptId: string,
) => {
  return useObservable<Observable<ReceiptWithParticipants>>(
    useMemo(() => {
      let isDisconnected = false;
      const connectionToastId = `receipt-sse-${receiptId}`;

      const notifyDisconnected = () => {
        if (isDisconnected) return;
        isDisconnected = true;
        toast.error(t("sseDisconnected"), {
          id: connectionToastId,
          duration: Infinity,
        });
      };

      const notifyReconnected = () => {
        if (!isDisconnected) return;
        isDisconnected = false;
        toast.dismiss(connectionToastId);
        toast.success(t("sseReconnected"));
      };

      return new Observable<ReceiptWithParticipants>((handler) => {
        if (typeof window === "undefined") {
          handler.next(initialData);
          handler.complete();
          return;
        }

        const eventSource = new EventSource(`/api/receipt/${receiptId}`);

        eventSource.onopen = () => {
          notifyReconnected();
        };

        eventSource.onmessage = (event) => {
          if (event.data === "connection established") return;
          const { data, success } = receiptWithParticipantsSchema.safeParse(
            JSON.parse(event.data),
          );
          if (success) {
            handler.next(data);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          handler.error(new Error("sse disconnected"));
        };

        return () => {
          eventSource.close();
        };
      }).pipe(
        retry({
          delay: (_error, retryCount) => {
            notifyDisconnected();
            const delayMs = Math.min(1000 * 2 ** (retryCount - 1), 10_000);
            return merge(timer(delayMs), fromEvent(window, "online")).pipe(
              take(1),
            );
          },
        }),
        startWith(initialData),
        distinctUntilChanged(isEqual),
        finalize(() => {
          toast.dismiss(connectionToastId);
        }),
      );
    }, [receiptId, initialData]),
    forceSync,
  );
};

interface ReceiptFormInnerProps {
  receipt: Receipt;
  participants: ReceiptWithParticipants["participants"];
  receiptId: string;
}

const ReceiptFormInner: React.FC<ReceiptFormInnerProps> = ({
  receipt,
  participants,
  receiptId,
}) => {
  const setParticipants = useParticipantsStore((s) => s.setParticipants);
  const participantsCount = useParticipantsStore((s) => s.participants.length);

  useEffect(() => {
    setParticipants(participants);
  }, [participants, setParticipants]);

  // Use the new react-hook-form based state
  const formState = useReceiptFormState(receipt, receiptId);

  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [splittingModalProps, setSplittingModalProps] =
    useState<EditModalProps | null>(null);
  const [splittingSheetOpen, setSplittingSheetOpen] = useState(false);
  const [editingModalProps, setEditingModalProps] =
    useState<EditModalProps | null>(null);
  const [editingDialogOpen, setEditingDialogOpen] = useState(false);

  const {
    scenario: { form, canEdit, type: scenarioType },
    openEditModal,
    closeModal,
    proceed,
    goBack,
    canProceed,
    editModalProps,
  } = formState;

  const UiGate = useJoinFlowOverlay(scenarioType, receiptId);

  useEffect(() => {
    if (editModalProps?.view === "splitting") {
      setSplittingModalProps(editModalProps);
      setSplittingSheetOpen(true);
    }
  }, [editModalProps]);

  useEffect(() => {
    if (editModalProps?.view === "editing") {
      setEditingModalProps(editModalProps);
      setEditingDialogOpen(true);
    }
  }, [editModalProps]);

  useEffect(() => {
    if (scenarioType !== "splitting") {
      setSplittingSheetOpen(false);
      setSplittingModalProps(null);
    }
  }, [scenarioType]);

  // Get field array for positions
  const positionFields = useWatch({
    control: form.control,
    name: "positions",
  });

  const currentReceipt = useWatch({ control: form.control }) as Receipt;
  const { errors } = form.formState;
  const screenCardClassName =
    "mx-auto my-3 w-full max-w-3xl rounded-3xl border border-border/70 bg-card p-4 text-foreground shadow-[0_14px_38px_rgba(15,23,42,0.10)] md:p-5";
  const reviewToastId = `receipt-review-${receiptId}`;
  const proceedLabel: TranslationKey =
    scenarioType === "validation" ? "toSplitting" : "proceed";

  useEffect(() => {
    if (scenarioType === "validation") {
      toast(t("receiptNeedsReview"), {
        id: reviewToastId,
        duration: Infinity,
        closeButton: true,
      });
      return;
    }

    toast.dismiss(reviewToastId);
  }, [scenarioType, reviewToastId]);

  return (
    <ReceiptFormContext.Provider value={formState}>
      <FormProvider {...form}>
        {UiGate}
        <Drawer
          onCloseAnimationEnd={() => {
            setSplittingSheetOpen(false);
            setSplittingModalProps(null);
            if (editModalProps?.view === "splitting") {
              closeModal();
            }
          }}
          open={splittingSheetOpen}
        >
          {splittingModalProps?.view === "splitting" && (
            <SplittingSheet {...splittingModalProps} />
          )}
        </Drawer>

        <Dialog
          open={editingDialogOpen}
          onOpenChange={(open) => {
            if (!open) setEditingDialogOpen(false);
          }}
        >
          {editingModalProps?.view === "editing" && (
            <DialogContent
              className="sm:max-w-xl"
              onAnimationEnd={(e) => {
                const state = (e.currentTarget as HTMLElement).getAttribute(
                  "data-state",
                );
                if (state === "closed" && !editingDialogOpen) {
                  setEditingModalProps(null);
                  if (editModalProps?.view === "editing") {
                    closeModal();
                  }
                }
              }}
            >
              <EditingDialog
                {...editingModalProps}
                onRequestClose={() => setEditingDialogOpen(false)}
              />
            </DialogContent>
          )}
        </Dialog>

        {/* Participants Modal Drawer */}
        <Drawer
          open={participantsModalOpen}
          onClose={() => setParticipantsModalOpen(false)}
        >
          <ParticipantsSheet
            receiptId={receiptId}
            onClose={() => setParticipantsModalOpen(false)}
          />
        </Drawer>

        <div className="flex-1 flex flex-col justify-between">
          <div className={screenCardClassName}>
            {scenarioType === "summary" ? (
              <SummaryScreen
                receipt={currentReceipt}
                receiptId={receiptId}
                onBack={goBack}
              />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("receipt")}
                  </h2>
                </div>

                <div className="space-y-1.5">
                  {positionFields.map((field, index) => {
                    const hasPriceError = hasFormPathError(
                      errors,
                      `positions.${index}.price`,
                    );
                    const hasQuantityError = hasFormPathError(
                      errors,
                      `positions.${index}.quantity`,
                    );
                    const hasOverallError = hasFormPathError(
                      errors,
                      `positions.${index}.overall`,
                    );
                    const hasClaimsError = hasFormPathError(
                      errors,
                      `positions.${index}.claims`,
                    );
                    const claimsErrorMessage = getFormPathErrorMessage(
                      errors,
                      `positions.${index}.claims`,
                    );
                    const hasRowNumberError =
                      hasPriceError ||
                      hasQuantityError ||
                      hasOverallError ||
                      hasClaimsError;
                    return (
                      <Card
                        key={field.id}
                        variant="interactive"
                        shadow={canEdit.positionForm ? "md" : "sm"}
                        interactive={!!canEdit.positionForm}
                        className="overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            canEdit.positionForm &&
                            openEditModal({ type: "position", index })
                          }
                          className={
                            canEdit.positionForm
                              ? "w-full cursor-pointer text-left"
                              : "w-full cursor-default text-left"
                          }
                        >
                          <CardContent className="py-1.5 px-4">
                            <div
                              className={`flex items-center gap-3 ${
                                hasRowNumberError ? "text-destructive" : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-bold text-foreground">
                                  {field.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <span
                                    className={
                                      hasPriceError ? "text-destructive" : ""
                                    }
                                  >
                                    {formatMoney(field.price)}
                                  </span>{" "}
                                  x{" "}
                                  <span
                                    className={
                                      hasQuantityError ? "text-destructive" : ""
                                    }
                                  >
                                    {field.quantity}
                                  </span>
                                </p>
                              </div>
                              <span
                                className={`rounded-lg border bg-card px-2 py-1 text-xs font-medium ${
                                  hasQuantityError
                                    ? "border-destructive text-destructive"
                                    : "border-border/70 text-muted-foreground"
                                }`}
                              >
                                {field.quantity}x
                              </span>
                              <span
                                className={`text-base font-semibold ${
                                  hasOverallError
                                    ? "text-destructive"
                                    : "text-foreground"
                                }`}
                              >
                                {formatMoney(field.overall)}
                              </span>
                            </div>
                            <DistributionBar
                              data={field}
                              className="mt-2 h-1 rounded-full"
                            />
                            {hasClaimsError && claimsErrorMessage && (
                              <p className="mt-1 text-xs text-destructive">
                                {claimsErrorMessage}
                              </p>
                            )}
                          </CardContent>
                        </button>
                      </Card>
                    );
                  })}
                </div>

                <Card
                  variant="summary"
                  shadow="md"
                  className="mt-4 rounded-2xl"
                >
                  <CardContent className="py-1.5 px-4">
                    <div>
                      {(currentReceipt.discounts.length > 0 ||
                        currentReceipt.fees.length > 0) && (
                        <>
                          <div className="gap-1">
                            {currentReceipt.discounts.length > 0 && (
                              <Modifiers type="discounts" />
                            )}
                            {currentReceipt.fees.length > 0 && (
                              <Modifiers type="fees" />
                            )}
                          </div>
                          <div className="my-3 border-t border-border/70" />
                        </>
                      )}

                      <button
                        type="button"
                        className={`mt-3 flex w-full items-center justify-between rounded-md px-1 py-1 text-sm ${
                          canEdit.totalsForm
                            ? "cursor-pointer hover:bg-muted/45"
                            : "cursor-default"
                        }`}
                        onClick={() =>
                          canEdit.totalsForm &&
                          openEditModal({ type: "totals" })
                        }
                      >
                        <span className="text-muted-foreground">
                          {t("total")}
                        </span>
                        <span
                          className={
                            hasFormPathError(errors, "totals.total")
                              ? "font-semibold text-destructive"
                              : "font-semibold"
                          }
                        >
                          {formatMoney(currentReceipt.totals.total)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-md px-1 py-1 ${
                          canEdit.totalsForm
                            ? "cursor-pointer hover:bg-muted/45"
                            : "cursor-default"
                        }`}
                        onClick={() =>
                          canEdit.totalsForm &&
                          openEditModal({ type: "totals" })
                        }
                      >
                        <span className="text-base font-semibold">
                          {t("grandTotal")}
                        </span>
                        <span
                          className={
                            hasFormPathError(errors, "totals.grandTotal")
                              ? "text-2xl font-bold text-destructive"
                              : "text-2xl font-bold"
                          }
                        >
                          {formatMoney(currentReceipt.totals.grandTotal)}
                        </span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          <div className="sticky bottom-[5.50rem] z-10 mx-auto mb-1 w-full max-w-3xl px-2">
            <DistributionBar
              data={currentReceipt}
              className="h-1.5 rounded-full border border-white/70 bg-white/55 backdrop-blur-xl"
            />
          </div>
          <ReceiptActionBar
            receiptId={receiptId}
            isSplitting={scenarioType === "splitting"}
            proceedLabel={proceedLabel}
            participantsCount={participantsCount}
            canProceed={canProceed}
            onOpenParticipants={() => setParticipantsModalOpen(true)}
            onProceed={proceed}
            onAddPosition={
              canEdit.positionForm ? () => openEditModal("addPosition") : undefined
            }
            onAddDiscount={
              canEdit.modifierForm ? () => openEditModal("addDiscount") : undefined
            }
            onAddFee={canEdit.modifierForm ? () => openEditModal("addFee") : undefined}
          />
        </div>
      </FormProvider>
    </ReceiptFormContext.Provider>
  );
};

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({
  initialData,
  receiptId,
}) => {
  const { receipt, participants } = useReceiptWithUpdates(
    initialData,
    receiptId,
  );

  return (
    <ParticipantsStoreProvider initialParticipants={participants}>
      <ReceiptFormInner
        receipt={receipt as Receipt}
        participants={participants}
        receiptId={receiptId}
      />
    </ParticipantsStoreProvider>
  );
};
