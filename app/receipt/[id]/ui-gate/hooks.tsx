import { FormScenario } from "@/app/receipt/[id]/useReceiptFormState";
import { useUser } from "@/context/AuthContext";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { useState } from "react";
import { checkUiGate } from "@/app/receipt/[id]/ui-gate/functions";
import { joinToReciept } from "@/app/receipt/[id]/ui-gate/join-to-receipt-csr";
import { SettingsDialog } from "@/app/receipt/[id]/ui-gate/settings-dialog";

export function useUiGate(formType: FormScenario["type"], receiptId: string) {
  const { user } = useUser();
  const participants = useParticipantsStore((s) => s.participants);
  const [joining, setJoining] = useState(false);

  const state = checkUiGate(participants, user, formType);
  if (state === 'join' && !joining) {
    setJoining(true);
    joinToReciept(receiptId).catch().then(() => setJoining(false));
  } else if (state === 'settings') {
    return <SettingsDialog />;
  }
  return <></>;
}