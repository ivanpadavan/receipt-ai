import { useMemo, useState } from "react";
import type {
  ReceiptChatLive,
  ReceiptChatLiveHistory,
} from "@/model/receipt/schema-chat";
import { useUser } from "@/context/AuthContext";

interface OptimisticState {
  entry: Extract<ReceiptChatLiveHistory[number], { role: "user" }>;
  baseHistoryLength: number;
}

export function useOptimisticChatHistory(chat: ReceiptChatLive) {
  const [optimisticState, setOptimisticState] = useState<OptimisticState | null>(null);
  const { user } = useUser();

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

  const displayHistory: ReceiptChatLiveHistory = reconciledOptimisticState
    ? [...chat.history, reconciledOptimisticState.entry]
    : chat.history;

  function setOptimisticMessage(content: string | null) {
    if (content === null) {
      setOptimisticState(null);
      return;
    }

    setOptimisticState({
      entry: {
        id: `optimistic-${crypto.randomUUID()}`,
        role: "user",
        participantId: user.id,
        displayName: user.user_metadata.displayName,
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
    userJustSentAMessage: optimisticState !== null
  };
}
