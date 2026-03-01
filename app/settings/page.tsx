"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/AuthContext";
import { toast } from "sonner";
import { t } from "@/app/i18n/translations";
import { SettingsForm } from "@/app/settings/SettingsForm";
import { UserMetadata } from "@supabase/supabase-js";
import { updateUserProfileClient } from "@/app/settings/update-user-profile-client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import {
  cardPaddingVariants,
  screenShell,
  textVariants,
} from "@/app/receipt/components/ui-styles";

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user.is_anonymous) router.replace("/");
  }, [user, router]);

  const handleSave = async (values: UserMetadata & { avatarFile?: File }) => {
    try {
      await updateUserProfileClient(values);
      toast.success(t("save"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("genericTryAgain"));
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        screenShell,
      )}
    >
      <Card
        variant="default"
        shadow="md"
        className={cn("mx-auto w-full max-w-md", cardPaddingVariants({ size: "lg" }))}
      >
        <h1
          className={cn(
            "mb-6 text-center",
            textVariants({ size: "lg", weight: "semibold" }),
          )}
        >
          {t("settings")}
        </h1>
        <CardContent className="p-0">
          <SettingsForm user={user} onSubmit={handleSave} />
        </CardContent>
      </Card>
    </div>
  );
}
