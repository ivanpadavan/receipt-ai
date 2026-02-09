"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldContent, FieldGroup } from "@/components/ui/field";
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
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

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

export type SettingsFormValues = UserMetadata & { avatarFile?: File } ;

const formShellVariants = cva("flex flex-col");
const emailTextVariants = cva("text-sm text-muted-foreground");
const uploadCardVariants = cva(
  "rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors",
);
const uploadTitleVariants = cva("text-sm font-medium");
const uploadHintVariants = cva("text-xs text-muted-foreground");
const cropFrameVariants = cva("bg-black/80 rounded-lg overflow-hidden");
const zoomLabelVariants = cva("text-sm text-muted-foreground");

interface SettingsFormProps {
  user: User;
  onSubmit: (values: SettingsFormValues) => Promise<void> | void;
  submitLabel?: string;
  onValidChange?: (valid: boolean) => void;
}

export const SettingsForm = ({
  user,
  onSubmit,
  submitLabel,
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
      className={cn("gap-6", formShellVariants())}
      onSubmit={handleSubmit(handleSave)}
    >
      <div className="flex items-center gap-4">
        <UserAvatar
          className="h-12 w-12"
          userMetadata={{ avatarUrl, displayName }}
        />
        {user.email && (
          <div className={emailTextVariants()}>{user.email}</div>
        )}
      </div>

      <FieldGroup>
        <Field>
          <Label htmlFor="displayName">{t("yourName")}</Label>
          <FieldContent>
            <Input
              id="displayName"
              {...register("displayName", { required: true })}
            />
          </FieldContent>
        </Field>

        <Field>
          <Label>{t("avatarImage")}</Label>
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
                    onClick={triggerFileInput}
                    className={cn(
                      "flex items-center gap-4 p-4 cursor-pointer",
                      uploadCardVariants(),
                    )}
                  >
                    <UserAvatar
                      className="h-16 w-16"
                      userMetadata={{ avatarUrl, displayName }}
                    />
                    <div className="flex flex-col gap-1">
                      <div className={uploadTitleVariants()}>
                        {value ? t("changeAvatar") : t("uploadAvatar")}
                      </div>
                      <div className={uploadHintVariants()}>
                        {t("avatarUploadHint")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileInput}
                    >
                      {t("uploadAvatar")}
                    </Button>
                    {captureSupported && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={triggerCameraInput}
                      >
                        {t("takeAvatarPhoto")}
                      </Button>
                    )}
                  </div>

                  <AlertDialog open={cropOpen} onOpenChange={setCropOpen}>
                    <AlertDialogContent className="max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("cropAvatar")}</AlertDialogTitle>
                      </AlertDialogHeader>
                      <div
                        className={cn(
                          "relative w-full h-72",
                          cropFrameVariants(),
                        )}
                      >
                        {cropImage && (
                          <Cropper
                            image={cropImage}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={zoomLabelVariants()}>
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
                      <AlertDialogFooter>
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
              )}
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <Button
        type="submit"
        disabled={!displayName?.trim() || saving || isSubmitting}
      >
        {saving || isSubmitting ? t("saving") : (submitLabel ?? t("save"))}
      </Button>
    </form>
  );
};
