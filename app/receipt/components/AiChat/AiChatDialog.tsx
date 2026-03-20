"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { cn } from "@/utils/cn";
import { textVariants, rowVariants, stackGapVariants } from "@/app/receipt/components/ui-styles";
import { t } from "@/app/i18n/translations";
import { apiClient } from "@/app/api-client";
import { SummaryScreen } from "@/app/receipt/components/SummaryScreen/SummaryScreen";
import { AiChatStructuralPreview } from "@/app/receipt/components/AiChat/AiChatStructuralPreview";
import type {
  ReceiptChatResponse,
  ReceiptChatToolEvent,
} from "@/model/receipt/schema-chat";

type TranscriptEntry = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  response?: ReceiptChatResponse;
};

function getToolEventContent(event: ReceiptChatToolEvent) {
  if (event.type === "requested_receipt_images") {
    return t("aiChatRequestedReceiptImages");
  }

  return "";
}

interface AiChatDialogProps {
  receiptId: string;
  receiptTitle?: string;
}

const createId = () => crypto.randomUUID();

function getAssistantTranscriptContent(response: ReceiptChatResponse) {
  if (response.type === "question") {
    return response.message;
  }

  const title = response.receipt.meta.title ?? t("receipt");
  const positionCount = response.receipt.positions.length;

  return response.type === "structural_preview"
    ? `${t("aiChatStructuralPreview")}: ${title} (${positionCount} ${t("positions")})`
    : `${t("aiChatClaimsPreview")}: ${title} (${positionCount} ${t("positions")})`;
}

function renderAssistantResponse(response: ReceiptChatResponse) {
  if (response.type === "question") {
    return (
      <ReceiptCard shadow="sm" radius="xl" className="overflow-hidden">
        <div className="p-3">
          <div className={textVariants({ size: "sm", tone: "muted", style: "caps" })}>
            AI
          </div>
          <div className={textVariants({ size: "sm" })}>{response.message}</div>
        </div>
      </ReceiptCard>
    );
  }

  if (response.type === "structural_preview") {
    return <AiChatStructuralPreview receipt={response.receipt} />;
  }

  return <SummaryScreen receipt={response.receipt} onBack={() => {}} />;
}

export const AiChatDialog: React.FC<AiChatDialogProps> = ({
  receiptId,
  receiptTitle,
}) => {
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, isSending]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    const nextUserMessage: TranscriptEntry = {
      id: createId(),
      role: "user",
      content: trimmed,
    };
    const nextTranscript = [...messages, nextUserMessage];

    setMessages(nextTranscript);
    setMessage("");
    setIsSending(true);

    try {
      const response = await apiClient.sendReceiptChatMessage(receiptId, {
        message: trimmed,
        history: nextTranscript
          .filter(
            (
              entry,
            ): entry is Extract<TranscriptEntry, { role: "user" | "assistant" }> =>
              entry.role === "user" || entry.role === "assistant",
          )
          .map(({ role, content }) => ({ role, content })),
      });

      setMessages((current) => {
        const toolEvents = response.events.map((event: ReceiptChatToolEvent) => ({
          id: createId(),
          role: "system" as const,
          content: getToolEventContent(event),
        }));

        return [
          ...current,
          ...toolEvents,
          {
            id: createId(),
            role: "assistant" as const,
            content: getAssistantTranscriptContent(response),
            response,
          },
        ];
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "relative isolate overflow-hidden rounded-full border border-transparent bg-transparent px-0 py-0 text-foreground shadow-none",
          )}
          aria-label={t("aiChat")}
          title={t("aiChat")}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#f97316,#facc15,#4ade80,#22d3ee,#818cf8,#f472b6,#f97316)] opacity-90"
          />
          <span
            aria-hidden
            className="absolute inset-[1px] rounded-full bg-background/95 backdrop-blur-md"
          />
          <span className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            <Bot className="h-4 w-4" />
            <span>{t("aiChat")}</span>
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="flex max-h-[80vh] min-h-[32rem] flex-col">
          <DialogHeader className="border-b border-border/40 px-6 py-5 text-left">
            <DialogTitle className={textVariants({ size: "lg", weight: "semibold" })}>
              {t("aiChat")}
            </DialogTitle>
            <DialogDescription className={textVariants({ size: "sm", tone: "muted" })}>
              {receiptTitle ? `${receiptTitle} · ` : ""}
              {t("aiChatPlaceholder")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className={stackGapVariants({ size: "sm" })}>
              {messages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                  <div className={textVariants({ size: "sm", tone: "muted" })}>
                    {t("aiChatEmpty")}
                  </div>
                </div>
              )}

              {messages.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex w-full",
                    entry.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {entry.response ? (
                    <div className="max-w-full sm:max-w-[90%]">
                      {renderAssistantResponse(entry.response)}
                    </div>
                  ) : entry.role === "system" ? (
                    <div className="w-full text-center">
                      <div
                        className={textVariants({
                          size: "xs",
                          tone: "muted",
                        })}
                      >
                        {entry.content}
                      </div>
                    </div>
                  ) : (
                    <ReceiptCard
                      shadow="sm"
                      radius="xl"
                      tone={entry.role === "user" ? "warm" : "soft"}
                      className="max-w-[90%] overflow-hidden"
                    >
                      <div className="p-3">
                        <div className={textVariants({ size: "sm", tone: "muted", style: "caps" })}>
                          {entry.role === "user" ? "You" : "AI"}
                        </div>
                        <div className={textVariants({ size: "sm" })}>
                          {entry.content}
                        </div>
                      </div>
                    </ReceiptCard>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <ReceiptCard shadow="sm" radius="xl" tone="soft" className="overflow-hidden">
                    <div className="p-3">
                      <div className={textVariants({ size: "sm", tone: "muted", style: "caps" })}>
                        AI
                      </div>
                      <div className={textVariants({ size: "sm", tone: "muted" })}>
                        {t("aiChatThinking")}
                      </div>
                    </div>
                  </ReceiptCard>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-border/40 bg-background/95 px-4 py-4"
          >
            <div className="flex items-end gap-3">
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("aiChatPlaceholder")}
                disabled={isSending}
                className="h-11"
              />
              <Button type="submit" disabled={isSending || !message.trim()}>
                <Send className="h-4 w-4" />
                {t("aiChatSend")}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
