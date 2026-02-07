import { FormScenario } from "@/app/receipt/[id]/useReceiptFormState";
import { useUser } from "@/context/AuthContext";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { useEffect, useRef, useState } from "react";
import { checkUiGate } from "@/app/receipt/[id]/ui-gate/functions";
import { joinToReciept } from "@/app/receipt/[id]/ui-gate/join-to-receipt-csr";
import { SettingsDialog } from "@/app/receipt/[id]/ui-gate/settings-dialog";
import { useRouter } from "next/navigation";
import { RemovedDialog } from "@/app/receipt/[id]/ui-gate/removed-dialog";

export function useUiGate(formType: FormScenario["type"], receiptId: string) {
  const { user } = useUser();
  const participants = useParticipantsStore((s) => s.participants);

  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [removedOpen, setRemovedOpen] = useState(false);
  const wasJoinedRef = useRef<boolean | null>(null);
  const joinRequestedRef = useRef(false);

  const state = checkUiGate(participants, user, formType);
  const isJoined = participants.some((p) => p.id === user.id);

  useEffect(() => {
    if (state !== "join") {
      joinRequestedRef.current = false;
      return;
    }
    if (joining || joinRequestedRef.current) return;

    let cancelled = false;
    joinRequestedRef.current = true;
    setJoining(true);
    joinToReciept(receiptId)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setJoining(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state, joining, receiptId]);

  useEffect(() => {
    const prev = wasJoinedRef.current;
    wasJoinedRef.current = isJoined;
    if (prev === true && !isJoined) {
      setRemovedOpen(true);
    }
  }, [isJoined]);

  if (removedOpen) {
    return <RemovedDialog onGoHome={() => router.push("/")} />;
  }

  if (state === "settings") {
    return <SettingsDialog />;
  }

  return null;
}
