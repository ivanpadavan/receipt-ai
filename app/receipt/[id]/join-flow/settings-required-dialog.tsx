import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from "@/app/i18n/translations";
import { SettingsForm, SettingsFormValues } from "@/app/settings/SettingsForm";
import React, { useCallback, useEffect, useState } from "react";
import { useUser } from "@/context/AuthContext";
import { useGoogleOneTapLogin } from "@react-oauth/google";
import { handleSignIn } from "@/app/receipt/utils/auth";
import { ParticipantDTO } from "@/model/receipt/model";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/app/receipt/components/ui/user-avatar";
import { cn } from "@/utils/cn";
import { apiClient } from "@/app/api-client";
import {
  dialogContentWide,
  dialogHeaderTitle,
  dialogHeader,
  dialogBodySpacing,
  rowVariants,
  inlineGapVariants,
  stackGapVariants,
  textVariants,
  surfaceVariants,
  cardPaddingVariants,
  avatarSizeVariants,
  buttonContentVariants,
} from "@/app/receipt/components/ui-styles";
import "./scroll-detect.css";

interface JoinFlowSettingsDialogProps {
  receiptId: string;
  offlineAnonymousCandidates: ParticipantDTO[];
}

export function JoinFlowSettingsDialog({
  receiptId,
  offlineAnonymousCandidates,
}: JoinFlowSettingsDialogProps) {
  useGoogleOneTapLogin({
    onSuccess: handleSignIn,
    promptMomentNotification: (v) => {
      if (v.getMomentType() === "display") {
        document.body.style.pointerEvents = "";
      }
    },
  });

  const { user } = useUser();

  const [open, setOpen] = useState(false);
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);

  useEffect(() => setOpen(true), []);

  const handleClaimParticipant = useCallback(
    async (participantId: string) => {
      setIsClaimingId(participantId);
      try {
        await apiClient.joinReceipt(receiptId, {
          replaceParticipantId: participantId,
        });
        setOpen(false);
      } finally {
        setIsClaimingId(null);
      }
    },
    [receiptId],
  );

  const handleSettingsSubmit = useCallback(
    async (values: SettingsFormValues) => {
      if (!values.displayName.trim()) return;
      await apiClient.joinReceipt(receiptId, {
        profile: {
          displayName: values.displayName.trim(),
          avatarUrl: values.avatarUrl,
          avatarFile: values.avatarFile,
        },
      });
      setOpen(false);
    },
    [receiptId],
  );

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className={dialogContentWide}>
        <AlertDialogHeader className={dialogHeader}>
          <AlertDialogTitle className={dialogHeaderTitle}>
            {t("settings")}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className={dialogBodySpacing}>
          {offlineAnonymousCandidates.length > 0 && (
            <div className={cn(stackGapVariants({ size: "sm" }), 'mb-3')}>
              <div className={textVariants({ size: "sm", weight: "medium" })}>
                {t("alreadyParticipated")}
              </div>
              <div
                className={cn(
                  "scroll-detect flex flex-col max-h-[14rem] overflow-y-auto pr-1 border-y",
                  "[--scroll-border-off:transparent]",
                  "[--scroll-border-on:var(--can-scroll)_theme(colors.border/50%)]",
                  "border-y-[var(--scroll-border-on,var(--scroll-border-off))]",
                  stackGapVariants({ size: "sm" }),
                )}
              >
                {offlineAnonymousCandidates.map((participant) => (
                  <Button
                    key={participant.id}
                    type="button"
                    variant="outline"
                    size="unset"
                    className={cn(
                      rowVariants({ align: "center", justify: "start", width: "full" }),
                      inlineGapVariants({ size: "md" }),
                      surfaceVariants({
                        tone: "default",
                        radius: "xl",
                        shadow: "none",
                        interactive: false,
                      }),
                      cardPaddingVariants({ size: "sm" }),
                    )}
                    disabled={isClaimingId !== null}
                    onClick={() => void handleClaimParticipant(participant.id)}
                  >
                    <UserAvatar
                      className={avatarSizeVariants({ size: "sm" })}
                      userMetadata={{
                        displayName: participant.displayName,
                      }}
                      showRing
                      ringColor={participant.color}
                      fallbackColor={participant.color}
                    />
                    <span className={cn(buttonContentVariants(), "text-left")}>
                      {participant.displayName}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
          <SettingsForm
            user={user}
            onSubmit={handleSettingsSubmit}
            submitLabel={t("join")}
            submitPendingLabel={t("joining")}
          />
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
