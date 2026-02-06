"use client";

import { t } from "@/app/i18n/translations";
import {
  useReceiptFormState,
  ReceiptState,
} from "@/app/receipt/[id]/useReceiptFormState";
import { Button } from "@/components/ui/button";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { ReceiptData } from "@/model/receipt/model";
import React, {
  createContext,
  useContext,
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
import { SummaryScreen } from "@/app/receipt/components/SummaryScreen/SummaryScreen";
import { distinctUntilChanged, Observable, startWith } from "rxjs";
import { receiptWithParticipantsSchema } from "@/model/receipt/schema";
import { Drawer } from "@/components/ui/drawer";
import { isEqual } from "lodash-es";
import { FormProvider, useWatch } from "react-hook-form";
import { Pencil } from "lucide-react";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { useUiGateStore } from "@/app/receipt/store/uiGate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/AuthContext";
import { SettingsForm } from "@/app/settings/SettingsForm";
import { supabase } from "@/utils/supabase/client";

interface EditableReceiptFormProps {
  initialData: ReceiptData;
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

const useReceiptWithUpdates = (initialData: ReceiptData, receiptId: string) => {
  const setParticipants = useParticipantsStore((s) => s.setParticipants);
  return useObservable<Observable<ReceiptData>>(
    useMemo(() => {
      return new Observable<ReceiptData>((handler) => {
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
            setParticipants(data.participants);
            handler.next(data.receipt);
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
  const { user } = useUser();
  const router = useRouter();
  const participantsInitialized = useParticipantsStore((s) => s.initialized);
  const hasParticipant = useParticipantsStore((s) => s.hasParticipant);
  const gateStep = useUiGateStore((s) => s.step);
  const isBlocked = useUiGateStore((s) => s.isBlocked);
  const openChoice = useUiGateStore((s) => s.openChoice);
  const openSettings = useUiGateStore((s) => s.openSettings);
  const openRemoved = useUiGateStore((s) => s.openRemoved);
  const closeGate = useUiGateStore((s) => s.closeGate);

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

  // Get field array for positions
  const positionFields = useWatch({
    control: form.control,
    name: "positions",
  });

  const currentReceipt = useWatch({ control: form.control }) as ReceiptData;

  const isAnonymous =
    user?.is_anonymous === true ||
    user?.identities?.some((identity) => identity.provider === "anonymous");
  const displayName = (user?.user_metadata?.displayName as string | undefined) ?? "";

  React.useEffect(() => {
    if (scenarioType !== "splitting") return;
    if (!isAnonymous) return;
    if (displayName && displayName !== "Anonymous") return;
    openChoice();
  }, [scenarioType, isAnonymous, displayName, openChoice]);

  React.useEffect(() => {
    if (!participantsInitialized || !user?.id) return;
    if (isAnonymous) return;
    if (!hasParticipant(user.id)) {
      openRemoved();
    }
  }, [participantsInitialized, user?.id, hasParticipant, isAnonymous, openRemoved]);

  const handleSettingsSubmit = async (values: {
    displayName: string;
    avatarUrl: string | null;
    avatarFile: File | null;
  }) => {
    if (!values.displayName.trim()) return;
    let nextAvatarUrl = values.avatarUrl;

    if (values.avatarFile) {
      const extension = values.avatarFile.name.split(".").pop() || "jpg";
      const filePath = `${user?.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, values.avatarFile, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        nextAvatarUrl = data.publicUrl;
      }
    }
    await supabase.auth.updateUser({
      data: {
        displayName: values.displayName.trim(),
        avatarUrl: nextAvatarUrl,
      },
    });
    await fetch(`/api/receipt/${receiptId}/participants/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    closeGate();
  };

  return (
    <ReceiptFormContext.Provider value={formState}>
      <FormProvider {...form}>
        {isBlocked && (
          <div className="fixed inset-0 bg-black/40 z-30" />
        )}

        <AlertDialog open={gateStep === "choice"}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("authPromptTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("authPromptBody")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  openSettings();
                }}
              >
                {t("continueAnon")}
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => {
                  openSettings();
                  window.open(`/auth/sign-in?next=/receipt/${receiptId}`, "_blank");
                }}
              >
                {t("authYes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={gateStep === "settings"} onOpenChange={() => {}}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings")}</AlertDialogTitle>
            </AlertDialogHeader>
            <SettingsForm
              userEmail={user?.email ?? ""}
              initialDisplayName={displayName}
              initialAvatarUrl={(user?.user_metadata?.avatarUrl as string | undefined) ?? ""}
              onSubmit={handleSettingsSubmit}
              submitLabel={t("save")}
            />
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={gateStep === "removed"}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("removedTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("removedBody")}</AlertDialogDescription>
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
          <div className="p-4 h-full">
            <SummaryScreen
              receipt={currentReceipt}
              onBack={goBack}
            />
          </div>
        ) : (
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
                  <Button variant="outline" onClick={goBackToEditing} disabled={isBlocked}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("edit")}
                  </Button>
                  <ParticipantsBadge
                    onClick={() => setParticipantsModalOpen(true)}
                    disabled={isBlocked}
                  />
                </>
              )}
              <Button onClick={proceed} disabled={!canProceed || isBlocked}>
                {scenarioType === "splitting" ? t("done") : t("proceed")}
              </Button>
            </div>
          </div>
        )}
      </FormProvider>
    </ReceiptFormContext.Provider>
  );
};
