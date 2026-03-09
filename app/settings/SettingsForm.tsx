"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import Cropper, { Area } from "react-easy-crop";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from "@/app/i18n/translations";
import { User, UserMetadata } from "@supabase/supabase-js";
import { UserAvatar } from "@/app/receipt/components/ui/user-avatar";
import { cn } from "@/utils/cn";
import {
  avatarSizeVariants,
  dialogContentWide,
  dialogFooter,
  dialogHeaderTitle,
  dialogHeader,
  dialogBodySpacing,
  btnShadow,
  inputStateVariants,
  uploadPanel,
  inlineGapVariants,
  stackGapVariants,
  textVariants,
  radiusTokens,
} from "@/app/receipt/components/ui-styles";

// ── Settings-scoped styles ──────────────────────
const settingsUploadCardPadding = "p-4";
const settingsCropFrame = `bg-black/80 ${radiusTokens.lg} overflow-hidden`;

const captureSupported =
  typeof document === "object" &&
  document.createElement("input").capture !== undefined;

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedBlob = async (imageSrc: string, pixelCrop: Area) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Crop failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
};

export type SettingsFormValues = UserMetadata & { avatarFile?: File };

interface SettingsFormProps {
  user: User;
  onSubmit: (values: SettingsFormValues) => Promise<void> | void;
  submitLabel?: string;
  submitPendingLabel?: string;
  onValidChange?: (valid: boolean) => void;
}

export const SettingsForm = ({
  user,
  onSubmit,
  submitLabel,
  submitPendingLabel,
  onValidChange,
}: SettingsFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);

  useEffect(() => {
    reset({
      ...user.user_metadata,
    });
  }, [user, reset]);

  useEffect(() => {
    if (onValidChange) onValidChange(isValid);
  }, [isValid, onValidChange]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleAvatarFileChange = (
    file: File | null,
    onChange: (files: File | null) => void,
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setCropImage(result);
      setPendingFileName(file.name);
      setCropOpen(true);
      onChange(file);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const triggerCameraInput = () => cameraInputRef.current?.click();

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleApplyCrop = async (
    onChange: (files: FileList | null) => void,
  ) => {
    if (!cropImage || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(cropImage, croppedAreaPixels);
    const fileName = pendingFileName || "avatar.jpg";
    const file = new File([blob], fileName, { type: blob.type });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const fileList = dataTransfer.files;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setValue("avatarUrl", url, { shouldDirty: true });
    onChange(fileList);
    setCropOpen(false);
    setCropImage(null);
  };

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
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleAvatarFileChange(
                      e.target.files?.item(0) || null,
                      onChange,
                    )
                  }
                />
                {captureSupported && (
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) =>
                      handleAvatarFileChange(
                        e.target.files?.item(0) || null,
                        onChange,
                      )
                    }
                  />
                )}
                <div
                  className={cn(
                    "flex flex-col",
                    stackGapVariants({ size: "md" }),
                  )}
                >
                  <div
                    onClick={triggerFileInput}
                    className={cn(
                      "flex items-center cursor-pointer",
                      inlineGapVariants({ size: "lg" }),
                      uploadPanel,
                      settingsUploadCardPadding,
                    )}
                  >
                    <UserAvatar
                      className={avatarSizeVariants({ size: "lg" })}
                      userMetadata={{ avatarUrl, displayName }}
                    />
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
                  {captureSupported && (
                    <Button
                      type="button"
                      onClick={triggerCameraInput}
                      className={btnShadow}
                    >
                      {t("takeAvatarPhoto")}
                    </Button>
                  )}

                  <AlertDialog open={cropOpen} onOpenChange={setCropOpen}>
                    <AlertDialogContent className={dialogContentWide}>
                      <AlertDialogHeader className={dialogHeader}>
                        <AlertDialogTitle className={dialogHeaderTitle}>
                          {t("cropAvatar")}
                        </AlertDialogTitle>
                      </AlertDialogHeader>
                      <div
                        className={cn(
                          dialogBodySpacing,
                          "relative w-full h-72",
                          settingsCropFrame,
                        )}
                      >
                        {cropImage && (
                          <Cropper
                            image={cropImage}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                          />
                        )}
                      </div>
                      <div
                        className={cn(
                          "flex items-center",
                          inlineGapVariants({ size: "md" }),
                        )}
                      >
                        <span
                          className={textVariants({ size: "sm", tone: "muted" })}
                        >
                          {t("zoom")}
                        </span>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.05}
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <AlertDialogFooter
                        className={cn(dialogFooter, inlineGapVariants({ size: "sm" }))}
                      >
                        <AlertDialogCancel onClick={() => setCropOpen(false)}>
                          {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleApplyCrop(onChange)}
                        >
                          {t("save")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          />
        </Field>
      </FieldGroup>

      <Button
        type="submit"
        disabled={!displayName?.trim() || saving || isSubmitting}
      >
        {saving || isSubmitting
          ? (submitPendingLabel ?? t("saving"))
          : (submitLabel ?? t("save"))}
      </Button>
    </form>
  );
};
