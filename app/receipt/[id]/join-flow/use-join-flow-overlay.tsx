import React, { useEffect, useRef, useState } from "react";
import { FormScenario } from "@/app/receipt/[id]/useReceiptFormState";
import { useUser } from "@/context/AuthContext";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import {
  getJoinFlowState,
  getOfflineAnonymousCandidates,
} from "@/app/receipt/[id]/join-flow/rules";
import { JoinFlowSettingsDialog } from "@/app/receipt/[id]/join-flow/settings-required-dialog";
import { RemovedFromReceiptDialog } from "@/app/receipt/[id]/join-flow/removed-from-receipt-dialog";
import { apiClient } from "@/app/api-client";

export function useJoinFlowOverlay(
  formType: FormScenario["type"],
  receiptId: string,
): React.ReactNode {
  const { user } = useUser();
  const participants = useParticipantsStore((s) => s.participants);
  const [removedOpen, setRemovedOpen] = useState(false);
  const wasJoinedRef = useRef<boolean | null>(null);
  const joinRequestedRef = useRef(false);
  const removedInSessionRef = useRef(false);
  const state = getJoinFlowState(participants, user, formType);
  const isJoined = participants.some((p) => p.id === user.id);
  const offlineAnonymousCandidates = getOfflineAnonymousCandidates(
    participants,
    user,
  );

  useEffect(() => {
    const prev = wasJoinedRef.current;
    wasJoinedRef.current = isJoined;
    if (prev === true && !isJoined) {
      removedInSessionRef.current = true;
      setRemovedOpen(true);
      return;
    }

    if (removedInSessionRef.current || removedOpen) return;
    if (state !== "join") {
      joinRequestedRef.current = false;
      return;
    }
    if (joinRequestedRef.current) return;
    joinRequestedRef.current = true;
    void apiClient.joinReceipt(receiptId).catch(() => undefined);
  }, [isJoined, removedOpen, state, receiptId]);

  if (removedOpen) {
    return <RemovedFromReceiptDialog />;
  }

  if (state === "settings") {
    return (
      <JoinFlowSettingsDialog
        receiptId={receiptId}
        offlineAnonymousCandidates={offlineAnonymousCandidates}
      />
    );
  }

  return <></>;
}
