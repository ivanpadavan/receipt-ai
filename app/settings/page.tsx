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
    <div className="flex flex-col items-center justify-center p-4 gap-4 bg-amber-50">
      <Card
        variant="default"
        shadow="md"
        className="mx-auto w-full max-w-md p-6"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          {t("settings")}
        </h1>
        <CardContent className="p-0">
          <SettingsForm user={user} onSubmit={handleSave} />
        </CardContent>
      </Card>
    </div>
  );
}
