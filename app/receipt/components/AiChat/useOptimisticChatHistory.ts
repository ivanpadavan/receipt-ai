import { useMemo, useState } from "react";
import type {
  ReceiptChatHistoryEntry,
  ReceiptChatPersisted,
} from "@/model/receipt/schema-chat";
import { useUser } from "@/context/AuthContext";
import { useParticipantsStore } from "@/app/receipt/store/participants";

interface OptimisticState {
  entry: Extract<ReceiptChatHistoryEntry, { role: "user" }>;
  baseHistoryLength: number;
}

export function useOptimisticChatHistory(chat: ReceiptChatPersisted) {
  const [optimisticState, setOptimisticState] = useState<OptimisticState | null>(null);
  const participants = useParticipantsStore((state) => state.participants);
  const { user } = useUser();
  const currentUserId = user.id;

  const reconciledOptimisticState = useMemo(() => {
    if (!optimisticState) return null;
    const nextEntries = chat.history.slice(optimisticState.baseHistoryLength);
    const hasPersistedEcho = nextEntries.some(
      (entry) =>
        entry.role === "user" &&
        entry.content === optimisticState.entry.content &&
        entry.participantId === optimisticState.entry.participantId,
    );

    return hasPersistedEcho ? null : optimisticState;
  }, [chat.history, optimisticState]);

  const displayHistory: ReceiptChatHistoryEntry[] = reconciledOptimisticState
    ? [...chat.history, reconciledOptimisticState.entry]
    : chat.history;

  function setOptimisticMessage(content: string | null) {
    if (content === null) {
      setOptimisticState(null);
      return;
    }

    const lastUserEntry = [...chat.history]
      .reverse()
      .find((entry) => entry.role === "user");
    const currentUserParticipant = participants.find(
      (participant) => participant.id === currentUserId,
    );

    setOptimisticState({
      entry: {
        id: `optimistic-${crypto.randomUUID()}`,
        role: "user",
        participantId:
          currentUserParticipant?.id ??
          currentUserId ??
          lastUserEntry?.participantId ??
          "unknown-user",
        content: content.trim(),
      },
      baseHistoryLength: chat.history.length,
    });
  }

  return {
    chat: {
      ...chat,
      history: displayHistory,
    },
    setOptimisticMessage,
  };
}
