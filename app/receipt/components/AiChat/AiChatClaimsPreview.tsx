"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { SummaryScreen } from "@/app/receipt/components/SummaryScreen/SummaryScreen";
import { stackGapVariants, textVariants } from "@/app/receipt/components/ui-styles";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import { buildClaimsPreviewReceipt } from "@/model/receipt/claims-preview";
import type { Receipt } from "@/model/receipt/model";
import type { ReceiptChatResponse } from "@/model/receipt/schema-chat";

type ClaimsPreviewResponse = Extract<ReceiptChatResponse, { type: "claims_preview" }>;

interface AiChatClaimsPreviewProps {
  receiptSnapshot: Receipt;
  response: ClaimsPreviewResponse;
  onApply: () => void;
}

export const AiChatClaimsPreview: React.FC<AiChatClaimsPreviewProps> = ({
  receiptSnapshot,
  response,
  onApply,
}) => {
  const previewReceipt = buildClaimsPreviewReceipt(receiptSnapshot, response.positionClaims);

  return (
    <ReceiptCard shadow="sm" radius="xl" tone="soft" className="overflow-hidden">
      <div className={cn("p-4", stackGapVariants({ size: "sm" }))}>
        <div className={stackGapVariants({ size: "xs" })}>
          <div className={textVariants({ size: "sm", tone: "muted", style: "caps" })}>
            {t("aiChatClaimsPreview")}
          </div>
        </div>

        <div className="-mx-4">
          <SummaryScreen receipt={previewReceipt} hideHeader />
        </div>

        <div className="pt-1">
          <Button
            type="button"
            onClick={onApply}
            className="w-full rounded-full sm:w-auto"
          >
            {t("aiChatClaimsPreviewReviewChanges")}
          </Button>
        </div>
      </div>
    </ReceiptCard>
  );
};
