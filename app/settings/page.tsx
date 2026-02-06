"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { t } from "@/app/i18n/translations";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";

const captureSupported =
  typeof document === "object" &&
  document.createElement("input").capture !== undefined;

interface SettingsFormValues {
  name: string;
  avatarUrl: string;
  avatarFile: FileList | null;
}

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const isAnonymous =
    user?.is_anonymous === true ||
    user?.identities?.some((identity) => identity.provider === "anonymous");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<SettingsFormValues>({
    defaultValues: {
      name: (user?.user_metadata?.displayName as string | undefined) ?? "",
      avatarUrl: (user?.user_metadata?.avatarUrl as string | undefined) ?? "",
      avatarFile: null,
    },
  });

  const displayName = watch("name");
  const avatarUrl = watch("avatarUrl");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log("settings user_metadata", user?.user_metadata);
  }, [user?.user_metadata]);

  useEffect(() => {
    if (isAnonymous) router.replace("/auth/sign-in");
  }, [isAnonymous, router]);

  const initials = useMemo(() => {
    const source = displayName || user?.email || "U";
    return source.trim().substring(0, 1).toUpperCase();
  }, [displayName, user?.email]);

  useEffect(() => {
    reset({
      name: (user?.user_metadata?.displayName as string | undefined) ?? "",
      avatarUrl: (user?.user_metadata?.avatarUrl as string | undefined) ?? "",
      avatarFile: null,
    });
  }, [
    user?.user_metadata?.displayName,
    user?.user_metadata?.avatarUrl,
    reset,
  ]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleAvatarFileChange = (
    files: FileList | null,
    onChange: (files: FileList | null) => void,
  ) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onChange(files);
    if (files?.[0]) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      setValue("avatarUrl", url, { shouldDirty: true });
    } else {
      setPreviewUrl(null);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const triggerCameraInput = () => cameraInputRef.current?.click();

  const handleSave = async (values: SettingsFormValues) => {
    if (!values.name.trim()) return;
    setSaving(true);
    let nextAvatarUrl = values.avatarUrl.trim() || null;

    if (values.avatarFile?.[0]) {
      const file = values.avatarFile[0];
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) {
        setSaving(false);
        toast.error(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      nextAvatarUrl = data.publicUrl;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        displayName: values.name.trim(),
        avatarUrl: nextAvatarUrl,
      },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("save"));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4 bg-amber-50">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6 border border-amber-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-amber-800">
          {t("settings")}
        </h1>

        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-12 w-12">
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">
            {user?.email ?? t("yourName")}
          </div>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit(handleSave)}>
          <FieldGroup>
            <Field>
              <FieldLabel>{t("profileName")}</FieldLabel>
              <FieldContent>
                <Input
                  {...register("name")}
                  placeholder={t("yourName")}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("avatarImage")}</FieldLabel>
              <FieldContent>
                <Controller
                  control={control}
                  name="avatarFile"
                  render={({ field: { onChange, value } }) => (
                    <div className="flex flex-col gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarFileChange(e.target.files, onChange)}
                      />
                      {captureSupported && (
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={(e) => handleAvatarFileChange(e.target.files, onChange)}
                        />
                      )}
                      <div
                        onClick={triggerFileInput}
                        className="flex items-center gap-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-4 cursor-pointer hover:bg-amber-50 transition-colors"
                      >
                        <Avatar className="h-16 w-16">
                          {avatarUrl && <AvatarImage src={avatarUrl} />}
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-medium">
                            {value?.length ? t("changeAvatar") : t("uploadAvatar")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("avatarUploadHint")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={triggerFileInput}>
                          {t("uploadAvatar")}
                        </Button>
                        {captureSupported && (
                          <Button type="button" variant="outline" onClick={triggerCameraInput}>
                            {t("takeAvatarPhoto")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                />
              </FieldContent>
            </Field>

          </FieldGroup>

          <Button type="submit" disabled={!displayName?.trim() || saving || isSubmitting}>
            {saving || isSubmitting ? t("saving") : t("save")}
          </Button>
        </form>
      </div>
    </div>
  );
}
