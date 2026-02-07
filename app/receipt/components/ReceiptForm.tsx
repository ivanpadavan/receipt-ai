"use client";

import { t } from "@/app/i18n/translations";
import {
  useReceiptFormState,
  ReceiptState,
} from "@/app/receipt/[id]/useReceiptFormState";
import { Button } from "@/components/ui/button";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { Receipt, ReceiptWithParticipants } from "@/model/receipt/model";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { EditingSheet } from "@/app/receipt/components/EdititngSheet/EditingSheet";
import { SplittingSheet } from "@/app/receipt/components/SplittingSheet/SplittingSheet";
import {
  ParticipantsSheet,
  ParticipantsBadge,
} from "@/app/receipt/components/ParticipantsSheet";
import { SummaryScreen } from "@/app/receipt/components/SummaryScreen/SummaryScreen";
import { ShareReceiptDialog } from "@/app/receipt/components/ShareReceiptDialog";
import { distinctUntilChanged, Observable, startWith } from "rxjs";
import { receiptWithParticipantsSchema } from "@/model/receipt/schema";
import { Drawer } from "@/components/ui/drawer";
import { isEqual } from "lodash-es";
import { FormProvider, useWatch } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ParticipantsStoreProvider,
  useParticipantsStore,
} from "@/app/receipt/store/participants";
import { useJoinFlowOverlay } from "@/app/receipt/[id]/join-flow/use-join-flow-overlay";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";

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
      return new Observable<ReceiptWithParticipants>((handler) => {
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
          if (event.data === "connection established") return;
          const { data, success } = receiptWithParticipantsSchema.safeParse(
            JSON.parse(event.data),
          );
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

  useEffect(() => {
    setParticipants(participants);
  }, [participants, setParticipants]);

  // Use the new react-hook-form based state
  const formState = useReceiptFormState(receipt, receiptId);

  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);

  const {
    scenario: { form, canEdit, type: scenarioType },
    openEditModal,
    closeModal,
    proceed,
    goBack,
    goBackToEditing,
    canProceed,
    editModalProps,
  } = formState;

  const UiGate = useJoinFlowOverlay(scenarioType, receiptId);

  // Get field array for positions
  const positionFields = useWatch({
    control: form.control,
    name: "positions",
  });

  const currentReceipt = useWatch({ control: form.control }) as Receipt;
  const canEditPosition = !!canEdit.positionForm;
  const canEditModifier = !!canEdit.modifierForm;
  const canEditTotals = !!canEdit.totalsForm;
  const discountTotal = currentReceipt.discounts.reduce((acc, x) => acc + x.value, 0);
  const feeTotal = currentReceipt.fees.reduce((acc, x) => acc + x.value, 0);
  const formatMoney = (value: number) => `${Math.round(value)} ₽`;

  return (
    <ReceiptFormContext.Provider value={formState}>
      <FormProvider {...form}>
        {UiGate}
        {/*
          <AlertDialog open={gateStep === "removed"}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("removedTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("removedBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  closeGate();
                  router.push("/");
                }}
              >
                {t("goHome")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        */}

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
          <ParticipantsSheet
            receiptId={receiptId}
            onClose={() => setParticipantsModalOpen(false)}
          />
        </Drawer>

        {scenarioType === "summary" ? (
          <div className="p-4 h-full flex flex-col gap-3">
            <SummaryScreen receipt={currentReceipt} receiptId={receiptId} onBack={goBack} />
          </div>
        ) : (
          <div className="mx-auto my-3 w-full max-w-3xl rounded-3xl border border-border/70 bg-card p-4 text-foreground shadow-[0_14px_38px_rgba(15,23,42,0.10)] md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("receipt")}
              </h2>
              {canEdit.positionForm === true && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl"
                  onClick={() => openEditModal("addPosition")}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("addPosition")}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {positionFields.map((field, index) => {
                const clickable = canEditPosition;
                return (
                  <Card
                    key={field.id}
                    className={[
                      "overflow-hidden rounded-2xl border-border/60 bg-background/90",
                      "shadow-[0_12px_24px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.06)]",
                      clickable
                        ? "transition hover:border-border hover:shadow-[0_16px_34px_rgba(15,23,42,0.12),0_4px_10px_rgba(15,23,42,0.08)]"
                        : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => clickable && openEditModal({ type: "position", index })}
                      className={clickable ? "w-full cursor-pointer text-left" : "w-full cursor-default text-left"}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-medium text-foreground">
                              {field.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoney(field.price)} x {field.quantity}
                            </p>
                          </div>
                          <span className="rounded-lg border border-border/70 bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                            {field.quantity}x
                          </span>
                          <span className="text-base font-semibold text-foreground">
                            {formatMoney(field.overall)}
                          </span>
                        </div>
                      </CardContent>
                    </button>
                  </Card>
                );
              })}
            </div>

            <Card className="mt-4 rounded-2xl border-border/70 bg-muted/30 shadow-[0_10px_22px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.05)]">
              <CardContent className="p-4">
                <div
                  className={canEditTotals ? "cursor-pointer" : ""}
                  onClick={() => canEditTotals && openEditModal({ type: "totals" })}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("total")}</span>
                    <span className="font-semibold">{formatMoney(currentReceipt.totals.total)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("discounts")}:</span>
                    <span className="font-medium text-emerald-600">
                      {discountTotal > 0 ? `- ${formatMoney(discountTotal)}` : "-"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("fees")}:</span>
                    <span className="font-medium">{feeTotal > 0 ? `+ ${formatMoney(feeTotal)}` : "-"}</span>
                  </div>
                  <div className="my-3 border-t border-border/70" />
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">{t("grandTotal")}</span>
                    <span className="text-2xl font-bold">
                      {formatMoney(currentReceipt.totals.grandTotal)}
                    </span>
                  </div>
                </div>

                {canEditModifier && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg"
                      onClick={() => openEditModal("addDiscount")}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {t("addDiscount")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg"
                      onClick={() => openEditModal("addFee")}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {t("addFee")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="sticky bottom-3 z-10 mt-5">
              <div className="flex items-center gap-2">
                {scenarioType === "splitting" && (
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <ButtonGroup className="rounded-[22px] border border-white/80 bg-white/60 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.20)] backdrop-blur-2xl [&>*]:border-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-xl px-3 text-muted-foreground hover:text-foreground"
                        onClick={goBackToEditing}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{t("edit")}</span>
                      </Button>
                      <ButtonGroupSeparator className="mx-1 h-5 self-center opacity-70" />
                      <ParticipantsBadge
                        compact
                        onClick={() => setParticipantsModalOpen(true)}
                      />
                      <ButtonGroupSeparator className="mx-1 h-5 self-center opacity-70" />
                      <ShareReceiptDialog
                        receiptId={receiptId}
                        iconOnly
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 rounded-xl px-0 text-muted-foreground hover:text-foreground"
                        title={t("share")}
                      />
                    </ButtonGroup>
                  </div>
                )}
                {scenarioType !== "splitting" && (
                  <ShareReceiptDialog variant="outline" receiptId={receiptId} />
                )}
                <Button
                  onClick={proceed}
                  disabled={!canProceed}
                  className="h-12 rounded-2xl px-7 text-base font-semibold shadow-[0_14px_30px_rgba(249,115,22,0.36)]"
                >
                  {scenarioType === "splitting" ? t("done") : t("proceed")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </FormProvider>
    </ReceiptFormContext.Provider>
  );
};

export const ReceiptForm: React.FC<EditableReceiptFormProps> = ({
  initialData,
  receiptId,
}) => {
  const { receipt, participants } = useReceiptWithUpdates(initialData, receiptId);

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
