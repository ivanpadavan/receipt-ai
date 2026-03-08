"use client";

import { t, TranslationKey } from "@/app/i18n/translations";
import {
  ReceiptState,
  useReceiptFormState,
} from "@/app/receipt/[id]/useReceiptFormState";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import {
  Receipt,
  ReceiptPosition,
  ReceiptWithParticipants,
} from "@/model/receipt/model";
import React, {
  useCallback,
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
import { LabelValueRow } from "@/app/receipt/components/ui/LabelValueRow";
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
import { SearchBar } from "@/app/receipt/components/ui/SearchBar";
import {
  claimsError,
  divider,
  interactiveRowVariants,
  pillVariants,
  positionRowButtonVariants,
  receiptCardPadding,
  rowContentPaddingVariants,
  stackGapVariants,
  inlineGapVariants,
  rowVariants,
  textVariants,
  dangerToneVariants,
} from "@/app/receipt/components/ui-styles";
import { cn } from "@/utils/cn";
import { searchPositionsForDisplay } from "@/app/receipt/utils/search-positions";

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

export const ReceiptFormInner: React.FC<ReceiptFormInnerProps> = ({
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
  const [participantsSheetMounted, setParticipantsSheetMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const openParticipantsSheet = useCallback(() => {
    setParticipantsSheetMounted(true);
    setParticipantsModalOpen(true);
  }, []);
  const closeParticipantsSheet = useCallback(() => {
    setParticipantsModalOpen(false);
  }, []);

  const {
    scenario: { form, canEdit, type: scenarioType },
    openEditModal,
    proceed,
    goBack,
    canProceed,
    editModalProps,
  } = formState;
  const splittingModalProps = editModalProps.splitting;
  const editingModalProps = editModalProps.editing;

  const JoinFlow = useJoinFlowOverlay(scenarioType, receiptId);

  useEffect(() => {
    if (scenarioType !== "splitting" && splittingModalProps) {
      splittingModalProps.close();
    }
  }, [scenarioType, splittingModalProps]);

  // Get field array for positions
  const positionFields = useWatch({
    control: form.control,
    name: "positions",
  });
  const displayPositions = useMemo(
    () =>
      searchPositionsForDisplay(
        (positionFields as ReceiptPosition[]) ?? [],
        searchQuery,
      ),
    [positionFields, searchQuery],
  );

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
    } else {
      toast.dismiss(reviewToastId);
    }
    return () => void toast.dismiss(reviewToastId);
  }, [scenarioType, reviewToastId]);

  useEffect(() => {
    if (scenarioType === "summary") {
      setIsSearchOpen(false);
    }
  }, [scenarioType]);

  return (
    <ReceiptFormContext.Provider value={formState}>
      <FormProvider {...form}>
        {JoinFlow}
        <Drawer
          repositionInputs={false}
          onOpenChange={(open) => {
            !open && splittingModalProps?.close();
          }}
          onCloseAnimationEnd={() => {
            splittingModalProps?.onClosed();
          }}
          open={splittingModalProps?.open ?? false}
        >
          {splittingModalProps !== null && (
            <SplittingSheet
              key={splittingModalProps.fieldPath ?? "splitting-sheet"}
              {...splittingModalProps}
            />
          )}
        </Drawer>

        <Dialog
          open={editingModalProps?.open ?? false}
          onOpenChange={(open) => {
            if (!open) {
              editingModalProps?.close();
            }
          }}
        >
          {editingModalProps?.view === "editing" && (
            <DialogContent
              className="sm:max-w-xl"
              onAnimationEnd={(e) => {
                const state = (e.currentTarget as HTMLElement).getAttribute(
                  "data-state",
                );
                if (
                  state === "closed" &&
                  editingModalProps &&
                  !editingModalProps.open
                ) {
                  editingModalProps.onClosed();
                }
              }}
            >
              <EditingDialog
                {...editingModalProps}
                onRequestClose={editingModalProps.close}
              />
            </DialogContent>
          )}
        </Dialog>

        {/* Participants Modal Drawer */}
        <Drawer
          open={participantsModalOpen}
          onClose={closeParticipantsSheet}
          onCloseAnimationEnd={() => setParticipantsSheetMounted(false)}
          repositionInputs={false}
        >
          {participantsSheetMounted &&
            <ParticipantsSheet
              receiptId={receiptId}
              onClose={closeParticipantsSheet}
            />}
        </Drawer>

        <div className="flex-1 flex flex-col justify-between">
          <ReceiptCard
            shadow="lg"
            radius="3xl"
            className={cn("mx-auto my-3 w-full max-w-3xl", receiptCardPadding)}
          >
            {scenarioType === "summary" ? (
              <SummaryScreen
                receipt={currentReceipt}
                receiptId={receiptId}
                onBack={goBack}
              />
            ) : (
              <>
                <div
                  className={cn(
                    rowVariants({
                      align: "center",
                      justify: "between",
                      width: "full",
                    }),
                    "mb-3",
                  )}
                >
                  <h2
                    className={textVariants({
                      size: "sm",
                      weight: "medium",
                      tone: "muted",
                      style: "caps",
                    })}
                  >
                    {t("receipt")}
                  </h2>
                </div>

                <div className={stackGapVariants({ size: "sm" })}>
                  {displayPositions.length === 0 && searchQuery.trim() ? (
                    <ReceiptCard shadow="sm" radius="2xl">
                      <CardContent
                        className={cn(
                          rowContentPaddingVariants({ density: "regular" }),
                          textVariants({
                            size: "2xl",
                            align: "center",
                            weight: 'bold'
                          }),
                        )}
                      >
                        {t("searchNoResults")}
                      </CardContent>
                    </ReceiptCard>
                  ) : null}

                  {displayPositions.map(({ position: field, originalIndex }) => {
                    const hasPriceError = hasFormPathError(
                      errors,
                      `positions.${originalIndex}.price`,
                    );
                    const hasQuantityError = hasFormPathError(
                      errors,
                      `positions.${originalIndex}.quantity`,
                    );
                    const hasOverallError = hasFormPathError(
                      errors,
                      `positions.${originalIndex}.overall`,
                    );
                    const hasClaimsError = hasFormPathError(
                      errors,
                      `positions.${originalIndex}.claims`,
                    );
                    const claimsErrorMessage = getFormPathErrorMessage(
                      errors,
                      `positions.${originalIndex}.claims`,
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
                            openEditModal({
                              type: "position",
                              index: originalIndex,
                            })
                          }
                          className={cn(
                            "w-full text-left",
                            positionRowButtonVariants({
                              interactive: canEdit.positionForm,
                            }),
                          )}
                        >
                          <CardContent
                            className={rowContentPaddingVariants({
                              density: "tight",
                            })}
                          >
                            <div
                              className={cn(
                                rowVariants({
                                  align: "center",
                                  width: "full",
                                }),
                                inlineGapVariants({ size: "md" }),
                                hasRowNumberError ? "text-destructive" : "",
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "truncate",
                                    textVariants({ weight: "semibold" }),
                                  )}
                                >
                                  {field.name}
                                </p>
                                <p
                                  className={textVariants({
                                    size: "xs",
                                    tone: "muted",
                                  })}
                                >
                                  <span
                                    className={dangerToneVariants({
                                      tone: hasPriceError
                                        ? "danger"
                                        : "default",
                                    })}
                                  >
                                    {formatMoney(field.price)}
                                  </span>{" "}
                                  x{" "}
                                  <span
                                    className={dangerToneVariants({
                                      tone: hasQuantityError
                                        ? "danger"
                                        : "default",
                                    })}
                                  >
                                    {field.quantity}
                                  </span>
                                </p>
                              </div>
                              <span
                                className={cn(
                                  pillVariants({
                                    tone: hasQuantityError
                                      ? "danger"
                                      : "neutral",
                                    radius: "lg",
                                  }),
                                )}
                              >
                                {field.quantity}x
                              </span>
                              <span
                                className={dangerToneVariants({
                                  base: "baseSemibold",
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
                              <p className={cn("mt-1", claimsError)}>
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
                  <CardContent
                    className={rowContentPaddingVariants({ density: "tight" })}
                  >
                    <div>
                      {(currentReceipt.discounts.length > 0 ||
                        currentReceipt.fees.length > 0) && (
                        <>
                          <div className={inlineGapVariants({ size: "xs" })}>
                            {currentReceipt.discounts.length > 0 && (
                              <Modifiers type="discounts" />
                            )}
                            {currentReceipt.fees.length > 0 && (
                              <Modifiers type="fees" />
                            )}
                          </div>
                          <div className={cn("my-3", divider)} />
                        </>
                      )}

                      <button
                        type="button"
                        className={cn(
                          "w-full",
                          interactiveRowVariants({
                            interactive: canEdit.totalsForm,
                          }),
                        )}
                        onClick={() =>
                          canEdit.totalsForm &&
                          openEditModal({ type: "totals" })
                        }
                      >
                        <LabelValueRow
                          label={t("total")}
                          value={formatMoney(currentReceipt.totals.total)}
                          labelClassName={textVariants({
                            size: "sm",
                            tone: "muted",
                          })}
                          valueClassName={dangerToneVariants({
                            base: "semibold",
                            tone: hasFormPathError(errors, "totals.total")
                              ? "danger"
                              : "default",
                          })}
                        />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "w-full",
                          interactiveRowVariants({
                            interactive: canEdit.totalsForm,
                          }),
                        )}
                        onClick={() =>
                          canEdit.totalsForm &&
                          openEditModal({ type: "totals" })
                        }
                      >
                        <LabelValueRow
                          label={t("grandTotal")}
                          value={formatMoney(currentReceipt.totals.grandTotal)}
                          labelClassName={textVariants({ weight: "semibold" })}
                          valueClassName={dangerToneVariants({
                            base: "2xlBold",
                            tone: hasFormPathError(errors, "totals.grandTotal")
                              ? "danger"
                              : "default",
                          })}
                        />
                      </button>
                    </div>
                  </CardContent>
                </ReceiptCard>
              </>
            )}
          </ReceiptCard>
          <ReceiptActionBar
            receiptId={receiptId}
            primaryLabel={primaryLabel}
            participantsCount={participantsCount}
            canProceed={canPrimaryAction}
            showSearch={scenarioType !== "summary"}
            isSearchOpen={isSearchOpen}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenParticipants={openParticipantsSheet}
            onPrimaryAction={scenarioType === "summary" ? goBack : proceed}
            onAddPosition={
              canEdit.positionForm
                ? () => openEditModal("addPosition")
                : undefined
            }
            onAddDiscount={
              canEdit.modifierForm
                ? () => openEditModal("addDiscount")
                : undefined
            }
            onAddFee={
              canEdit.modifierForm ? () => openEditModal("addFee") : undefined
            }
          />
          {scenarioType !== "summary" ? (
            <SearchBar
              isOpen={isSearchOpen}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onRequestClose={() => setIsSearchOpen(false)}
            />
          ) : null}
        </div>
        <DistributionBar
          data={currentReceipt}
          tone="glass"
          className="h-1.5 fixed bottom-0"
        />
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
