"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
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
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const qrContainerVariants = cva("rounded-xl border bg-white p-3");
const triggerLabelVariants = cva("text-[11px] font-medium");
const shareContentPaddingVariants = cva("py-2");

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
    } catch (error) {
      // User canceled system share dialog.
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
  };

  const triggerLabel = label ?? t("share");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button {...buttonProps}>
          {stacked ? (
            <span className="flex flex-col items-center gap-1 leading-none">
              <Share2 className="h-4 w-4" />
              <span className={triggerLabelVariants()}>{triggerLabel}</span>
            </span>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              {!iconOnly && triggerLabel}
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("shareReceiptTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("shareReceiptHint")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className={cn(
            "flex flex-col items-center gap-4",
            shareContentPaddingVariants(),
          )}
        >
          <div className={qrContainerVariants()}>
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

          <Button type="button" variant="outline" className="gap-2" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            {t("copyLink")}
          </Button>
        </div>

        <AlertDialogFooter className="sm:flex-row sm:items-stretch gap-2">
          <AlertDialogCancel className="sm:flex-1">
            {t("close")}
          </AlertDialogCancel>
          {canShare && (
            <AlertDialogAction
              onClick={handleShare}
              className="gap-2 sm:flex-1"
            >
              <QrCode className="h-4 w-4" />
              {t("shareViaSystem")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
