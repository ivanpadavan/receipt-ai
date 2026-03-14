"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { t } from "@/app/i18n/translations";
import { User, UserMetadata } from "@supabase/supabase-js";
import { UserAvatar } from "@/app/receipt/components/ui/user-avatar";
import { ImageUploadCropper } from "@/app/components/image-upload-cropper";
import { cn } from "@/utils/cn";
import {
  avatarSizeVariants,
  btnShadow,
  inputStateVariants,
  uploadPanel,
  inlineGapVariants,
  stackGapVariants,
  textVariants,
} from "@/app/receipt/components/ui-styles";

// ── Settings-scoped styles ──────────────────────
const settingsUploadCardPadding = "p-4";

export type SettingsFormValues = UserMetadata & { avatarFile?: File };

interface SettingsFormProps {
  user: User;
  onSubmit: (values: SettingsFormValues) => Promise<void> | void;
  submitLabel?: string;
  submitPendingLabel?: string;
  externalPending?: boolean;
  onValidChange?: (valid: boolean) => void;
}

export const SettingsForm = ({
  user,
  onSubmit,
  submitLabel,
  submitPendingLabel,
  externalPending = false,
  onValidChange,
}: SettingsFormProps) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isValid },
  } = useForm<SettingsFormValues>({
    defaultValues: { ...user.user_metadata },
    mode: "onChange",
  });

  const displayName = watch("displayName");
  const avatarUrl = watch("avatarUrl");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reset({
      ...user.user_metadata,
    });
  }, [user, reset]);

  useEffect(() => {
    if (onValidChange) onValidChange(isValid);
  }, [isValid, onValidChange]);

  const handleSave = async (values: SettingsFormValues) => {
    // Костылек
    const avatarFile = (values.avatarFile instanceof FileList ? values.avatarFile.item(0) : values.avatarFile) ?? undefined;
    if (!values.displayName.trim()) return;
    setSaving(true);
    await onSubmit({ ...values, avatarFile });
    setSaving(false);
  };

  return (
    <form
      className={cn("flex w-full flex-col", stackGapVariants({ size: "lg" }))}
      onSubmit={handleSubmit(handleSave)}
    >
      <FieldGroup>
        <Field>
          <Label htmlFor="displayName">
            {t("yourName")}
          </Label>
          <Input
            id="displayName"
            {...register("displayName", { required: true })}
            className={inputStateVariants({ state: "default" })}
          />
        </Field>

        <Field>
          <Label>{t("avatarImage")}</Label>
          <Controller
            control={control}
            name="avatarFile"
            render={({ field: { onChange, value } }) => (
              <ImageUploadCropper
                title={t("cropAvatar")}
                aspect={1}
                cropShape="round"
                capture="user"
                onCropped={({ file, croppedImageBase64 }) => {
                  setValue("avatarUrl", croppedImageBase64, { shouldDirty: true });
                  onChange(file);
                }}
              >
                {({ captureSupported, openCameraPicker, openFilePicker }) => (
                  <div
                    className={cn(
                      "flex flex-col",
                      stackGapVariants({ size: "md" }),
                    )}
                  >
                    <div
                      onClick={openFilePicker}
                      className={cn(
                        "flex items-center cursor-pointer",
                        inlineGapVariants({ size: "lg" }),
                        uploadPanel,
                        settingsUploadCardPadding,
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-col",
                          stackGapVariants({ size: "xs" }),
                        )}
                      >
                        <UserAvatar
                          className={avatarSizeVariants({ size: "lg" })}
                          userMetadata={{ avatarUrl, displayName }}
                        />
                      </div>
                      <div
                        className={cn(
                          "flex flex-col",
                          stackGapVariants({ size: "xs" }),
                        )}
                      >
                        <div className={textVariants({ size: "sm", weight: "medium" })}>
                          {value ? t("changeAvatar") : t("uploadAvatar")}
                        </div>
                        <div
                          className={textVariants({ size: "xs", tone: "muted" })}
                        >
                          {t("avatarUploadHint")}
                        </div>
                      </div>
                    </div>
                    {captureSupported ? (
                      <Button
                        type="button"
                        onClick={openCameraPicker}
                        className={btnShadow}
                      >
                        {t("takePhoto")}
                      </Button>
                    ) : null}
                  </div>
                )}
              </ImageUploadCropper>
            )}
          />
        </Field>
      </FieldGroup>

      <Button
        type="submit"
        disabled={!displayName?.trim() || saving || isSubmitting || externalPending}
      >
        {saving || isSubmitting || externalPending
          ? (submitPendingLabel ?? t("saving"))
          : (submitLabel ?? t("save"))}
      </Button>
    </form>
  );
};
