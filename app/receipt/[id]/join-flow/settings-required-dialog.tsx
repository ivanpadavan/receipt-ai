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
import { supabase } from "@/utils/supabase/client";
import { useGoogleOneTapLogin } from "@react-oauth/google";
import { handleSignIn } from "@/app/receipt/utils/auth";
import {
  dialogContentWide,
  dialogHeaderTitle,
  dialogHeader,
  dialogBodySpacing,
} from "@/app/receipt/components/ui-styles";

export function JoinFlowSettingsDialog() {
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

  useEffect(() => setOpen(true), []);

  const handleSettingsSubmit = useCallback(
    async (values: SettingsFormValues) => {
      if (!values.displayName.trim()) return;
      let nextAvatarUrl = values.avatarUrl;

      if (values.avatarFile) {
        const extension = values.avatarFile.name.split(".").pop() || "jpg";
        const filePath = `${user?.id}/avatar.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, values.avatarFile, { upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          nextAvatarUrl = data.publicUrl;
        }
      }
      await supabase.auth.updateUser({
        data: {
          displayName: values.displayName.trim(),
          avatarUrl: nextAvatarUrl,
        },
      });
      setOpen(false);
    },
    [user],
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
          <SettingsForm
            user={user}
            onSubmit={handleSettingsSubmit}
            submitLabel={t("save")}
          />
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
