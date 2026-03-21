"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { SummaryScreen } from "@/app/receipt/components/SummaryScreen/SummaryScreen";
import { stackGapVariants, textVariants } from "@/app/receipt/components/ui-styles";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import { buildClaimsPreviewReceipt } from "@/model/receipt/claims-preview";
import type { Receipt } from "@/model/receipt/model";
import type { ReceiptChatResponse } from "@/model/receipt/schema-chat";
import {
  buildClaimsPreviewRemovedPositions,
  getClaimsPreviewStatus,
} from "@/app/receipt/components/AiChat/claims-apply";
import { useReceiptState } from "@/app/receipt/components/receipt-context";

type ClaimsPreviewResponse = Extract<ReceiptChatResponse, { type: "claims_preview" }>;

interface AiChatClaimsPreviewProps {
  response: ClaimsPreviewResponse;
  onApply: () => void;
}

export const AiChatClaimsPreview: React.FC<AiChatClaimsPreviewProps> = ({
  response,
  onApply,
}) => {
  const { scenario } = useReceiptState();
  const currentReceipt = scenario.form.getValues() as Receipt;
  const receiptSnapshot = response.receiptSnapshot;
  const previewReceipt = buildClaimsPreviewReceipt(receiptSnapshot, response.positionClaims);
  const removedPositions = buildClaimsPreviewRemovedPositions(currentReceipt, receiptSnapshot);
  const previewStatus = getClaimsPreviewStatus(
    currentReceipt,
    response.positionClaims,
  );
  const isApplied = previewStatus === "applied";
  const isExpired = previewStatus === "expired";

  return (
    <ReceiptCard
      shadow="sm"
      radius="xl"
      tone={isExpired ? "danger" : isApplied ? "success" : "soft"}
      className="overflow-hidden"
    >
      <div className={cn("p-4", stackGapVariants({ size: "sm" }))}>
        {isExpired && removedPositions.length > 0 && (
          <div className="rounded-2xl border border-rose-300/70 bg-rose-50/70 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className={textVariants({ size: "xs", weight: "semibold", tone: "danger" })}>
                  {t("aiChatClaimsPreviewExpiredTitle")}
                </div>
                <div className={textVariants({ size: "xs", tone: "muted" })}>
                  {t("aiChatClaimsPreviewExpiredText")}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="-mx-4">
          <SummaryScreen receipt={previewReceipt} hideHeader />
        </div>

        {!isApplied && !isExpired && (
          <Button type="button" onClick={onApply} className="w-full">
            {t("aiChatApplyBtnText")}
          </Button>
        )}

      </div>
    </ReceiptCard>
  );
};
