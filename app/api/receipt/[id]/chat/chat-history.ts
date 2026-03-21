import { t } from "@/app/i18n/translations";
import type {
  ReceiptChatHistoryEntry,
  ReceiptChatResponse,
} from "@/model/receipt/schema-chat";

export interface ChatPromptHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export function createUserChatEntry(
  id: string,
  participantId: string,
  content: string,
) {
  return {
    id,
    role: "user" as const,
    participantId,
    content,
  };
}

export function createAssistantChatEntry(
  id: string,
  response: ReceiptChatResponse,
) {
  return {
    id,
    role: "assistant" as const,
    response,
  };
}

function convertChatHistoryToLLM(response: ReceiptChatResponse) {
  if (response.type === "question") {
    return response.message;
  }

  const title =
    response.type === "structural_preview"
      ? response.receipt.meta.title
      : response.receiptSnapshot.meta.title;
  const positionCount =
    response.type === "structural_preview"
      ? response.receipt.positions.length
      : response.receiptSnapshot.positions.length;

  return response.type === "structural_preview"
    ? `${t("aiChatStructuralPreview")}: ${title} (${positionCount} ${t("positions")})`
    : `${t("aiChatClaimsPreview")}: ${title} (${positionCount} ${t("positions")})`;
}

export function buildPromptHistory(
  history: ReceiptChatHistoryEntry[],
): ChatPromptHistoryEntry[] {
  return history.map((entry) => {
    if (entry.role === "user") {
      return {
        role: "user",
        content: entry.content,
      };
    }

    return {
      role: "assistant",
      content: convertChatHistoryToLLM(entry.response),
    };
  });
}
