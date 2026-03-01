"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { t } from "@/app/i18n/translations";
import { Copy, Share2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import {
  iconSizeVariants,
  buttonContentVariants,
  stackGapVariants,
  inlineGapVariants,
  dialogHeader,
  dialogFooter,
  dialogHeaderTitle,
  dialogContent,
  dialogBodySpacing,
  radiusTokens,
} from "@/app/receipt/components/ui-styles";

// ── ShareReceipt-scoped styles ──────────────────────
const qrContainer = `${radiusTokens.xl} border bg-white p-3`;
const triggerLabel = "text-[11px] font-medium";

type ShareReceiptDialogProps = {
  receiptId: string;
  iconOnly?: boolean;
  stacked?: boolean;
  label?: string;
} & React.ComponentProps<typeof Button>;

export const ShareReceiptDialog: React.FC<ShareReceiptDialogProps> = ({
  receiptId,
  iconOnly = false,
  stacked = false,
  label,
  ...buttonProps
}) => {
  const [open, setOpen] = useState(false);

  const receiptUrl = useMemo(() => {
    if (typeof window === "undefined") return `/receipt/${receiptId}`;
    return `${window.location.origin}/receipt/${receiptId}`;
  }, [receiptId]);

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(receiptUrl);
    toast.success(t("copiedToClipboard"));
  };

  const handleShare = async () => {
    if (!canShare) return;
    try {
      await navigator.share({
        title: t("receipt"),
        url: receiptUrl,
      });
    } catch {
      // no-op
    }
  };

  const displayLabel = label ?? t("share");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button {...buttonProps}>
          {stacked ? (
            <span className={buttonContentVariants({ layout: "stacked" })}>
              <Share2 className={iconSizeVariants({ size: "sm" })} />
              <span className={triggerLabel}>
              {displayLabel}</span>
            </span>
          ) : (
            <>
              <Share2 className={iconSizeVariants({ size: "sm" })} />
              {!iconOnly && displayLabel}
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className={dialogContent}>
        <AlertDialogHeader className={dialogHeader}>
          <AlertDialogTitle className={dialogHeaderTitle}>
            {t("shareReceiptTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="mx-auto text-center">
            {t("shareReceiptHint")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className={cn(
            "flex flex-col items-center",
            stackGapVariants({ size: "lg" }),
            dialogBodySpacing,
          )}
        >
          <div className={qrContainer}>
            <QRCodeSVG
              value={receiptUrl}
              size={220}
              bgColor="#FFFFFF"
              fgColor="#111111"
              level="M"
              marginSize={1}
              title={t("shareReceiptQrAlt")}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className={buttonContentVariants({ layout: "inline" })}
            onClick={handleCopy}
          >
            <Copy className={iconSizeVariants({ size: "sm" })} />
            {t("copyLink")}
          </Button>
        </div>

        <AlertDialogFooter
          className={cn(dialogFooter, inlineGapVariants({ size: "sm" }))}
        >
          <AlertDialogCancel className="sm:flex-1">
            {t("close")}
          </AlertDialogCancel>
          {canShare && (
            <Button
              type="button"
              onClick={handleShare}
              className={cn(
                buttonContentVariants({ layout: "inline" }),
                "sm:flex-1",
              )}
            >
              <QrCode className={iconSizeVariants({ size: "sm" })} />
              {t("shareViaSystem")}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
