"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { t } from "@/app/i18n/translations";
import { SettingsForm } from "@/app/settings/SettingsForm";
import { UserMetadata } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const settingsShellVariants = cva("bg-amber-50 p-4");
const settingsTitleVariants = cva("text-2xl font-bold text-center");
const settingsCardPaddingVariants = cva("p-6");
const settingsCardContentVariants = cva("p-0");

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user.is_anonymous) router.replace("/");
  }, [user, router]);

  const handleSave = async (values: UserMetadata & { avatarFile?: File }) => {
    let nextAvatarUrl = values.avatarUrl;

    if (values.avatarFile) {
      const extension = values.avatarFile.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, values.avatarFile, { upsert: true });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      nextAvatarUrl = data.publicUrl;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        displayName: values.displayName.trim(),
        avatarUrl: nextAvatarUrl,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("save"));
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        settingsShellVariants(),
      )}
    >
      <Card
        variant="default"
        shadow="md"
        className={cn("mx-auto w-full max-w-md", settingsCardPaddingVariants())}
      >
        <h1 className={cn("mb-6", settingsTitleVariants())}>
          {t("settings")}
        </h1>
        <CardContent className={settingsCardContentVariants()}>
          <SettingsForm user={user} onSubmit={handleSave} />
        </CardContent>
      </Card>
    </div>
  );
}
