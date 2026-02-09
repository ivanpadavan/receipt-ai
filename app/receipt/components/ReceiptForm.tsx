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
import { CardContent } from "@/components/ui/card";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
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
import { DistributionBar } from "@/app/receipt/components/ui/DistributionBar";
import { ReceiptActionBar } from "@/app/receipt/components/ui/ReceiptActionBar";
import { pillVariants } from "@/app/receipt/components/ui-styles";
import { cn } from "@/utils/cn";
import { cva } from "class-variance-authority";

const sectionTitleVariants = cva(
  "text-sm font-semibold uppercase tracking-wide text-muted-foreground",
);

const receiptRowVariants = cva("rounded-md px-1 py-1", {
  variants: {
    interactive: {
      true: "cursor-pointer hover:bg-muted/45",
      false: "cursor-default",
    },
  },
  defaultVariants: {
    interactive: false,
  },
});

const rowLabelVariants = cva("text-muted-foreground");

const totalValueVariants = cva("font-semibold", {
  variants: {
    tone: {
      danger: "text-destructive",
      default: "",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const grandTotalLabelVariants = cva("text-base font-semibold");

const grandTotalValueVariants = cva("text-2xl font-bold", {
  variants: {
    tone: {
      danger: "text-destructive",
      default: "",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const overallValueVariants = cva("text-base font-semibold", {
  variants: {
    tone: {
      danger: "text-destructive",
      default: "text-foreground",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const positionHeaderVariants = cva("flex items-center gap-3", {
  variants: {
    tone: {
      default: "",
      danger: "text-destructive",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const positionNameVariants = cva("text-base font-bold text-foreground");
const positionMetaVariants = cva("text-xs text-muted-foreground");

const positionMetaValueVariants = cva("", {
  variants: {
    tone: {
      default: "",
      danger: "text-destructive",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const claimsErrorVariants = cva("text-xs text-destructive");

const dividerVariants = cva("border-t border-border/70");

const positionRowButtonVariants = cva("w-full text-left", {
  variants: {
    interactive: {
      true: "cursor-pointer",
      false: "cursor-default",
    },
  },
  defaultVariants: {
    interactive: false,
  },
});

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

  const JoinFlow = useJoinFlowOverlay(scenarioType, receiptId);

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
  const reviewToastId = `receipt-review-${receiptId}`;
  const primaryLabel: TranslationKey =
    scenarioType === "splitting"
        ? "done"
        : "toSplitting";
  const canPrimaryAction = scenarioType === "summary" ? true : canProceed;

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
        {JoinFlow}
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
          <ReceiptCard
            shadow="lg"
            radius="3xl"
            className="mx-auto my-3 w-full max-w-3xl p-4 md:p-5"
          >
            {scenarioType === "summary" ? (
              <SummaryScreen
                receipt={currentReceipt}
                receiptId={receiptId}
                onBack={goBack}
              />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className={sectionTitleVariants()}>{t("receipt")}</h2>
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
                      <ReceiptCard
                        key={field.id}
                        shadow={canEdit.positionForm ? "md" : "sm"}
                        interactive={!!canEdit.positionForm}
                        radius="2xl"
                        className="overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            canEdit.positionForm &&
                            openEditModal({ type: "position", index })
                          }
                        className={positionRowButtonVariants({
                          interactive: canEdit.positionForm,
                        })}
                        >
                          <CardContent className="py-1.5 px-4">
                            <div
                              className={positionHeaderVariants({
                                tone: hasRowNumberError ? "danger" : "default",
                              })}
                            >
                              <div className="min-w-0 flex-1">
                                <p className={cn("truncate", positionNameVariants())}>
                                  {field.name}
                                </p>
                                <p className={positionMetaVariants()}>
                                  <span
                                    className={positionMetaValueVariants({
                                      tone: hasPriceError ? "danger" : "default",
                                    })}
                                  >
                                    {formatMoney(field.price)}
                                  </span>{" "}
                                  x{" "}
                                  <span
                                    className={positionMetaValueVariants({
                                      tone: hasQuantityError ? "danger" : "default",
                                    })}
                                  >
                                    {field.quantity}
                                  </span>
                                </p>
                              </div>
                              <span
                                className={cn(
                                  pillVariants({
                                    tone: hasQuantityError ? "danger" : "neutral",
                                    radius: "lg",
                                  }),
                                  "px-2 py-1 text-xs font-medium",
                                )}
                              >
                                {field.quantity}x
                              </span>
                              <span
                                className={overallValueVariants({
                                  tone: hasOverallError ? "danger" : "default",
                                })}
                              >
                                {formatMoney(field.overall)}
                              </span>
                            </div>
                            <DistributionBar
                              data={field}
                              className="mt-2 h-1"
                            />
                            {hasClaimsError && claimsErrorMessage && (
                              <p className={cn("mt-1", claimsErrorVariants())}>
                                {claimsErrorMessage}
                              </p>
                            )}
                          </CardContent>
                        </button>
                      </ReceiptCard>
                    );
                  })}
                </div>

                <ReceiptCard
                  tone="soft"
                  shadow="md"
                  radius="2xl"
                  className="mt-4"
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
                          <div className={cn("my-3", dividerVariants())} />
                        </>
                      )}

                      <button
                        type="button"
                        className={cn(
                          "mt-3 flex w-full items-center justify-between text-sm",
                          receiptRowVariants({
                            interactive: canEdit.totalsForm,
                          }),
                        )}
                        onClick={() =>
                          canEdit.totalsForm &&
                          openEditModal({ type: "totals" })
                        }
                      >
                        <span className={rowLabelVariants()}>{t("total")}</span>
                        <span
                          className={totalValueVariants({
                            tone: hasFormPathError(errors, "totals.total")
                              ? "danger"
                              : "default",
                          })}
                        >
                          {formatMoney(currentReceipt.totals.total)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between",
                          receiptRowVariants({
                            interactive: canEdit.totalsForm,
                          }),
                        )}
                        onClick={() =>
                          canEdit.totalsForm &&
                          openEditModal({ type: "totals" })
                        }
                      >
                        <span className={grandTotalLabelVariants()}>
                          {t("grandTotal")}
                        </span>
                        <span
                          className={grandTotalValueVariants({
                            tone: hasFormPathError(errors, "totals.grandTotal")
                              ? "danger"
                              : "default",
                          })}
                        >
                          {formatMoney(currentReceipt.totals.grandTotal)}
                        </span>
                      </button>
                    </div>
                  </CardContent>
                </ReceiptCard>
              </>
            )}
          </ReceiptCard>
          {scenarioType !== "summary" && (
            <div className="sticky bottom-[5.50rem] z-10 mx-auto mb-1 w-full max-w-3xl px-2">
              <DistributionBar
                data={currentReceipt}
                tone="glass"
                className="h-1.5"
              />
            </div>
          )}
          <ReceiptActionBar
            receiptId={receiptId}
            primaryLabel={primaryLabel}
            participantsCount={participantsCount}
            canProceed={canPrimaryAction}
            onOpenParticipants={() => setParticipantsModalOpen(true)}
            onPrimaryAction={scenarioType === "summary" ? goBack : proceed}
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
