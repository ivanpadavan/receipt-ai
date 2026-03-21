import { t } from "@/app/i18n/translations";
import {
  formatReceiptBusinessValidationIssues,
  getReceiptBusinessValidationIssues,
} from "@/model/receipt/business-validation";
import type { Receipt } from "@/model/receipt/model";
import type {
  ReceiptChatHistoryEntry,
  ReceiptChatResponse,
} from "@/model/receipt/schema-chat";

export type ChatPromptHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

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

function getAssistantChatContent(response: ReceiptChatResponse) {
  if (response.type === "question") {
    return response.message;
  }

  if (response.type === "structural_preview") {
    const title = response.receipt.meta.title ?? t("receipt");
    const positionCount = response.receipt.positions.length;
    const issues = getReceiptBusinessValidationIssues(response.receipt);
    const formattedIssues = formatReceiptBusinessValidationIssues(issues);

    return formattedIssues.length === 0
      ? `${t("aiChatStructuralPreview")}: ${title} (${positionCount} ${t("positions")})`
      : `${t("aiChatStructuralPreview")}: ${title} (${positionCount} ${t("positions")})\nBusiness validation issues:\n${formattedIssues}`;
  }

  const title = response.receiptSnapshot.meta.title ?? t("receipt");
  const positionCount = response.receiptSnapshot.positions.length;
  return `${t("aiChatClaimsPreview")}: ${title} (${positionCount} ${t("positions")})`;
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
      content: getAssistantChatContent(entry.response),
    };
  });
}
