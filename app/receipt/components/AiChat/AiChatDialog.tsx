"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { GradientRing } from "@/app/receipt/components/ui/GradientRing";
import { cn } from "@/utils/cn";
import {
  textVariants,
  stackGapVariants,
} from "@/app/receipt/components/ui-styles";
import { t } from "@/app/i18n/translations";
import { apiClient } from "@/app/api-client";
import { useMoneyFormatter, useReceiptState } from "@/app/receipt/components/receipt-context";
import { useParticipantsStore } from "@/app/receipt/store/participants";
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
import type {
  ReceiptChatResponse,
  ReceiptChatToolEvent,
} from "@/model/receipt/schema-chat";
import type { Receipt } from "@/model/receipt/model";

interface TranscriptEntry {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  response?: ReceiptChatResponse;
  receiptSnapshot?: Receipt;
}

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

type StructuralPreviewResponse = Extract<
  ReceiptChatResponse,
  { type: "structural_preview" }
>;
type ClaimsPreviewResponse = Extract<
  ReceiptChatResponse,
  { type: "claims_preview" }
>;

const createId = () => crypto.randomUUID();

function getAssistantTranscriptContent(
  response: ReceiptChatResponse,
  receiptSnapshot: Receipt,
) {
  if (response.type === "question") {
    return response.message;
  }

  const title =
    response.type === "structural_preview"
      ? response.receipt.meta.title ?? t("receipt")
      : receiptSnapshot.meta.title ?? t("receipt");
  const positionCount =
    response.type === "structural_preview"
      ? response.receipt.positions.length
      : receiptSnapshot.positions.length;

  return response.type === "structural_preview"
    ? `${t("aiChatStructuralPreview")}: ${title} (${positionCount} ${t("positions")})`
    : `${t("aiChatClaimsPreview")}: ${title} (${positionCount} ${t("positions")})`;
}

function renderAssistantResponse(
  response: ReceiptChatResponse,
  receiptSnapshot: Receipt,
  onRequestStructuralApply: (response: StructuralPreviewResponse) => void,
  onRequestClaimsApply: (response: ClaimsPreviewResponse, receiptSnapshot: Receipt) => void,
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
      receiptSnapshot={receiptSnapshot}
      response={response}
      onApply={() => onRequestClaimsApply(response, receiptSnapshot)}
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
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pendingStructuralPreview, setPendingStructuralPreview] =
    useState<StructuralPreviewResponse | null>(null);
  const [pendingClaimsPreview, setPendingClaimsPreview] =
    useState<
      | {
          response: ClaimsPreviewResponse;
          receiptSnapshot: Receipt;
        }
      | null
    >(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const currentReceipt = scenario.form.getValues() as Receipt;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, isSending]);

  const structuralWarnings = pendingStructuralPreview
    ? buildStructuralLossWarnings(
        currentReceipt,
        pendingStructuralPreview.receipt,
        participants,
        pendingStructuralPreview.receipt.meta.currencySymbol ?? currencySymbol,
        formatMoney,
      )
    : [];
  const claimsReplaceWarnings = pendingClaimsPreview
    ? buildClaimsReplaceWarnings(
        currentReceipt,
        pendingClaimsPreview.response.positionClaims,
        participants,
        currentReceipt.meta.currencySymbol ?? currencySymbol,
        formatMoney,
      )
    : [];
  const claimsPreviewStatus = pendingClaimsPreview
    ? getClaimsPreviewStatus(
        currentReceipt,
        pendingClaimsPreview.response.receiptSnapshot,
        pendingClaimsPreview.response.positionClaims,
      )
    : "pending";
  const canReplaceClaims = pendingClaimsPreview && claimsPreviewStatus === "pending"
    ? canReplaceClaimsPreview(
        currentReceipt,
        pendingClaimsPreview.response.positionClaims,
      )
    : false;
  const hasClaimsData = pendingClaimsPreview
    ? hasClaimsPreviewData(pendingClaimsPreview.response.positionClaims)
    : false;
  const claimsConfirmOpen = pendingClaimsPreview !== null && claimsPreviewStatus === "pending";

  useEffect(() => {
    if (pendingClaimsPreview && claimsPreviewStatus !== "pending") {
      setPendingClaimsPreview(null);
    }
  }, [claimsPreviewStatus, pendingClaimsPreview]);

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
      const receiptSnapshot =
        response.type === "claims_preview"
          ? response.receiptSnapshot
          : (scenario.form.getValues() as Receipt);

      setMessages((current) => {
        const toolEvents = (response.events ?? []).map((event: ReceiptChatToolEvent) => ({
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
            content: getAssistantTranscriptContent(response, receiptSnapshot),
            response,
            receiptSnapshot,
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
                      {renderAssistantResponse(entry.response, entry.receiptSnapshot ?? currentReceipt, (response) => {
                        setPendingStructuralPreview(response);
                      }, (response, receiptSnapshot) => {
                        setPendingClaimsPreview({ response, receiptSnapshot });
                      })}
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
                        <div className={cn(textVariants({ size: "sm" }), "whitespace-pre-wrap")}>
                          {entry.content}
                        </div>
                      </div>
                    </ReceiptCard>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <GradientRing
                    animate
                    radius="2xl"
                    className="max-w-[90%] min-w-32"
                    data-slot="ai-chat-loading-gradient"
                  >
                    <ReceiptCard
                      shadow="sm" radius="2xl">
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

          <form
            onSubmit={handleSubmit}
            className="border-t border-border/40 px-4 py-4"
          >
            <InputGroup className="rounded-full border-border/60 bg-background shadow-sm">
              <InputGroupInput
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("aiChatPlaceholder")}
                disabled={isSending}
              />
              <InputGroupAddon className="pr-0" align="inline-end">
                <Button
                  type="submit"
                  disabled={isSending || !message.trim()}
                >
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
                    applyStructuralPreview(currentReceipt, pendingStructuralPreview.receipt),
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
                        pendingClaimsPreview.response.positionClaims,
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
                          pendingClaimsPreview.response.positionClaims,
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
