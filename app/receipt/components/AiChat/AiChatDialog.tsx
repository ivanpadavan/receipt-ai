"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { GradientRing } from "@/app/receipt/components/ui/GradientRing";
import { cn } from "@/utils/cn";
import { textVariants, stackGapVariants } from "@/app/receipt/components/ui-styles";
import { t } from "@/app/i18n/translations";
import { apiClient } from "@/app/api-client";
import { useMoneyFormatter, useReceiptState } from "@/app/receipt/components/receipt-context";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { useSseResource } from "@/app/receipt/components/useSseResource";
import { AiChatClaimsPreview } from "@/app/receipt/components/AiChat/AiChatClaimsPreview";
import {
  AiChatLossWarningBlock,
  AiChatStructuralPreview,
} from "@/app/receipt/components/AiChat/AiChatStructuralPreview";
import {
  applyStructuralPreview,
  buildStructuralLossWarnings,
} from "@/app/receipt/components/AiChat/structural-apply";
import {
  applyClaimsPreviewAdd,
  applyClaimsPreviewReplace,
  buildClaimsReplaceWarnings,
  canReplaceClaimsPreview,
  hasClaimsPreviewData,
  getClaimsPreviewStatus,
} from "@/app/receipt/components/AiChat/claims-apply";
import type { Receipt } from "@/model/receipt/model";
import type {
  ReceiptChatLive,
  ReceiptChatLiveHistory,
  ReceiptChatResponse,
  ReceiptChatToolEvent,
} from "@/model/receipt/schema-chat";
import { receiptChatLiveSchema } from "@/model/receipt/schema-chat";
import { useOptimisticChatHistory } from "@/app/receipt/components/AiChat/useOptimisticChatHistory";

interface AiChatDialogProps {
  receiptId: string;
  receiptTitle?: string;
}

type StructuralPreviewResponse = Extract<
  ReceiptChatResponse,
  { type: "structural_preview" }
>;
type ClaimsPreviewResponse = Extract<
  ReceiptChatResponse,
  { type: "claims_preview" }
>;

interface RequestHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

const EMPTY_CHAT: ReceiptChatLive = {
  history: [],
  pending: false,
};

function getToolEventContent(event: ReceiptChatToolEvent) {
  if (event.type === "requested_receipt_images") {
    return t("aiChatRequestedReceiptImages");
  }

  return "";
}

function getAssistantTranscriptContent(
  response: ReceiptChatResponse,
  receiptSnapshot?: Receipt,
) {
  if (response.type === "question") {
    return response.message;
  }

  const title =
    response.type === "structural_preview"
      ? response.receipt.meta.title ?? t("receipt")
      : receiptSnapshot?.meta.title ?? t("receipt");
  const positionCount =
    response.type === "structural_preview"
      ? response.receipt.positions.length
      : receiptSnapshot?.positions.length ?? 0;

  return response.type === "structural_preview"
    ? `${t("aiChatStructuralPreview")}: ${title} (${positionCount} ${t("positions")})`
    : `${t("aiChatClaimsPreview")}: ${title} (${positionCount} ${t("positions")})`;
}

function serializeChatHistory(history: ReceiptChatLiveHistory): RequestHistoryEntry[] {
  return history.flatMap((entry) => {
    if (entry.role === "user") {
      return [
        {
          role: "user" as const,
          content: entry.content,
        },
      ];
    }

    const receiptSnapshot =
      entry.response.type === "claims_preview"
        ? entry.response.receiptSnapshot
        : entry.response.type === "structural_preview"
          ? entry.response.receipt
          : undefined;

    return [
      {
        role: "assistant" as const,
        content: getAssistantTranscriptContent(entry.response, receiptSnapshot),
      },
    ];
  });
}

function renderAssistantResponse(
  response: ReceiptChatResponse,
  onRequestStructuralApply: (response: StructuralPreviewResponse) => void,
  onRequestClaimsApply: (response: ClaimsPreviewResponse) => void,
) {
  if (response.type === "question") {
    return (
      <ReceiptCard shadow="sm" radius="xl" className="overflow-hidden">
        <div className="p-3">
          <div className={textVariants({ size: "sm", tone: "muted", style: "caps" })}>
            AI
          </div>
          <div className={cn(textVariants({ size: "sm" }), "whitespace-pre-wrap")}>
            {response.message}
          </div>
        </div>
      </ReceiptCard>
    );
  }

  if (response.type === "structural_preview") {
    return (
      <AiChatStructuralPreview
        receipt={response.receipt}
        onApply={() => onRequestStructuralApply(response)}
      />
    );
  }

  return (
    <AiChatClaimsPreview
      response={response}
      onApply={() => onRequestClaimsApply(response)}
    />
  );
}

export const AiChatDialog: React.FC<AiChatDialogProps> = ({
  receiptId,
  receiptTitle,
}) => {
  const { scenario, replaceReceiptInForm } = useReceiptState();
  const participants = useParticipantsStore((state) => state.participants);
  const { currencySymbol, formatMoney } = useMoneyFormatter();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pendingStructuralPreview, setPendingStructuralPreview] =
    useState<StructuralPreviewResponse | null>(null);
  const [pendingClaimsPreview, setPendingClaimsPreview] =
    useState<ClaimsPreviewResponse | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const liveReceipt = scenario.form.watch() as Receipt;

  const chat = useSseResource({
    initialData: EMPTY_CHAT,
    url: `/api/receipt/${receiptId}/chat`,
    schema: receiptChatLiveSchema,
    connectionToastId: `receipt-chat-sse-${receiptId}`,
  });
  const {
    chat: optimisticChat,
    setOptimisticMessage,
    userJustSentAMessage
  } = useOptimisticChatHistory(chat);
  const displayHistory = optimisticChat.history;
  const chatPending = optimisticChat.pending;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [userJustSentAMessage]);

  const structuralWarnings = pendingStructuralPreview
    ? buildStructuralLossWarnings(
        liveReceipt,
        pendingStructuralPreview.receipt,
        participants,
        pendingStructuralPreview.receipt.meta.currencySymbol ?? currencySymbol,
        formatMoney,
      )
    : [];
  const claimsReplaceWarnings = pendingClaimsPreview
    ? buildClaimsReplaceWarnings(
        liveReceipt,
        pendingClaimsPreview.positionClaims,
        participants,
        formatMoney,
      )
    : [];
  const claimsPreviewStatus = pendingClaimsPreview
    ? getClaimsPreviewStatus(
        liveReceipt,
        pendingClaimsPreview.positionClaims,
      )
    : "pending";
  const canReplaceClaims =
    pendingClaimsPreview && claimsPreviewStatus === "pending"
      ? canReplaceClaimsPreview(
          liveReceipt,
          pendingClaimsPreview.positionClaims,
        )
      : false;
  const hasClaimsData = pendingClaimsPreview
    ? hasClaimsPreviewData(pendingClaimsPreview.positionClaims)
    : false;
  const claimsConfirmOpen =
    pendingClaimsPreview !== null && claimsPreviewStatus === "pending";

  useEffect(() => {
    if (pendingClaimsPreview && claimsPreviewStatus !== "pending") {
      setPendingClaimsPreview(null);
    }
  }, [claimsPreviewStatus, pendingClaimsPreview]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || isSending || chatPending) return;

    setMessage("");
    setOptimisticMessage(trimmed);
    setIsSending(true);

    try {
      await apiClient.sendReceiptChatMessage(receiptId, {
        message: trimmed,
        history: [
          ...serializeChatHistory(chat.history),
          {
            role: "user",
            content: trimmed,
          },
        ],
      });
    } catch {
      setOptimisticMessage(null);
      setMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const hasMessages = displayHistory.length > 0;
  const isChatPending = isSending || chatPending;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <GradientRing asChild radius="full">
          <Button
            type="button"
            variant="secondary"
            aria-label={t("aiChat")}
            title={t("aiChat")}
          >
            <Sparkles className="h-4 w-4" />
            <span>{t("aiChat")}</span>
          </Button>
        </GradientRing>
      </DialogTrigger>

      <DialogContent
        className="overflow-hidden p-0 sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          endRef.current?.scrollIntoView?.({ block: "end" });
        }}
      >
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
              {!hasMessages && !isChatPending && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                  <div className={textVariants({ size: "sm", tone: "muted" })}>
                    {t("aiChatEmpty")}
                  </div>
                </div>
              )}

              {displayHistory.flatMap((entry) => {
                if (entry.role === "user") {
                  return [
                    <div key={entry.id} className="flex w-full justify-end">
                      <ReceiptCard
                        shadow="sm"
                        radius="xl"
                        tone="warm"
                        className="max-w-[90%] overflow-hidden"
                      >
                        <div className="p-3">
                          <div
                            className={cn(textVariants({
                              size: "sm",
                              tone: "muted",
                            }), 'text-right')}
                          >
                            {entry.displayName}
                          </div>
                          <div
                            className={cn(
                              textVariants({ size: "sm" }),
                              "whitespace-pre-wrap",
                            )}
                          >
                            {entry.content}
                          </div>
                        </div>
                      </ReceiptCard>
                    </div>,
                  ];
                }

                return [
                  ...entry.response.events.map((event, index) => (
                    <div
                      key={`${entry.id}-event-${index}`}
                      className="w-full text-center"
                    >
                      <div
                        className={textVariants({
                          size: "xs",
                          tone: "muted",
                        })}
                      >
                        {getToolEventContent(event)}
                      </div>
                    </div>
                  )),
                  <div key={entry.id} className="flex w-full justify-start">
                    <div className="max-w-full sm:max-w-[90%]">
                      {renderAssistantResponse(
                        entry.response,
                        (response) => {
                          setPendingStructuralPreview(response);
                        },
                        (response) => {
                          setPendingClaimsPreview(response);
                        },
                      )}
                    </div>
                  </div>,
                ];
              })}

              {isChatPending && (
                <div className="flex justify-start">
                  <GradientRing
                    animate
                    radius="2xl"
                    className="min-w-32 max-w-[90%]"
                    data-slot="ai-chat-loading-gradient"
                  >
                    <ReceiptCard shadow="sm" radius="2xl">
                      <div className="p-3">
                        <div
                          className={textVariants({
                            size: "sm",
                            tone: "muted",
                            style: "caps",
                          })}
                        >
                          AI
                        </div>
                        <div className={textVariants({ size: "sm", tone: "muted" })}>
                          {t("aiChatThinking")}
                        </div>
                      </div>
                    </ReceiptCard>
                  </GradientRing>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border/40 px-4 py-4">
            <InputGroup className="rounded-full border-border/60 bg-background shadow-sm">
              <InputGroupInput
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("aiChatPlaceholder")}
                disabled={isSending}
              />
              <InputGroupAddon className="pr-0" align="inline-end">
                <Button type="submit" disabled={isSending || chatPending || !message.trim()}>
                  <Send className="h-4 w-4" />
                  {t("aiChatSend")}
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
      </DialogContent>

      <AlertDialog
        open={pendingStructuralPreview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStructuralPreview(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("aiChatStructuralPreviewConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("aiChatStructuralPreviewConfirmText")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AiChatLossWarningBlock
            title={t("aiChatStructuralPreviewLossesTitle")}
            description={t("aiChatStructuralPreviewLossesText")}
            warnings={structuralWarnings}
          />

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStructuralPreview(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStructuralPreview) {
                  replaceReceiptInForm(
                    applyStructuralPreview(
                      scenario.form.getValues() as Receipt,
                      pendingStructuralPreview.receipt,
                    ),
                  );
                }
                setPendingStructuralPreview(null);
              }}
            >
              {t("apply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={claimsConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPendingClaimsPreview(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("aiChatClaimsPreviewConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("aiChatClaimsPreviewConfirmText")}</AlertDialogDescription>
          </AlertDialogHeader>

          {canReplaceClaims && (
            <AiChatLossWarningBlock
              title={t("aiChatClaimsPreviewLossesTitle")}
              description={t("aiChatClaimsPreviewLossesText")}
              warnings={claimsReplaceWarnings}
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingClaimsPreview(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            {pendingClaimsPreview && (
              <>
                <AlertDialogAction
                  onClick={() => {
                    replaceReceiptInForm(
                      applyClaimsPreviewAdd(
                        scenario.form.getValues() as Receipt,
                        pendingClaimsPreview.positionClaims,
                      ),
                    );
                    setPendingClaimsPreview(null);
                  }}
                >
                  {t("aiChatClaimsPreviewAdd")}
                </AlertDialogAction>
                {canReplaceClaims && hasClaimsData && (
                  <AlertDialogAction
                    onClick={() => {
                      replaceReceiptInForm(
                        applyClaimsPreviewReplace(
                          scenario.form.getValues() as Receipt,
                          pendingClaimsPreview.positionClaims,
                        ),
                      );
                      setPendingClaimsPreview(null);
                    }}
                  >
                    {t("aiChatClaimsPreviewReplaceAll")}
                  </AlertDialogAction>
                )}
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
