"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface SettingsFormValues {
  displayName: string;
  avatarUrl: string;
  avatarFile: FileList | null;
}

interface SettingsFormProps {
  userEmail?: string;
  initialDisplayName: string;
  initialAvatarUrl: string;
  onSubmit: (values: {
    displayName: string;
    avatarUrl: string | null;
    avatarFile: File | null;
  }) => Promise<void> | void;
  submitLabel?: string;
  onValidChange?: (valid: boolean) => void;
}

export const SettingsForm = ({
  userEmail,
  initialDisplayName,
  initialAvatarUrl,
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
    defaultValues: {
      displayName: initialDisplayName,
      avatarUrl: initialAvatarUrl,
      avatarFile: null,
    },
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
      displayName: initialDisplayName,
      avatarUrl: initialAvatarUrl,
      avatarFile: null,
    });
  }, [initialDisplayName, initialAvatarUrl, reset]);

  useEffect(() => {
    if (onValidChange) onValidChange(isValid);
  }, [isValid, onValidChange]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const initials = useMemo(() => {
    const source = displayName || userEmail || "U";
    return source.trim().substring(0, 1).toUpperCase();
  }, [displayName, userEmail]);

  const handleAvatarFileChange = (
    files: FileList | null,
    onChange: (files: FileList | null) => void,
  ) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setCropImage(result);
      setPendingFileName(file.name);
      setCropOpen(true);
      onChange(files);
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
    if (!values.displayName.trim()) return;
    setSaving(true);
    await onSubmit({
      displayName: values.displayName.trim(),
      avatarUrl: values.avatarUrl.trim() || null,
      avatarFile: values.avatarFile?.[0] ?? null,
    });
    setSaving(false);
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit(handleSave)}>
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {userEmail && (
          <div className="text-sm text-muted-foreground">{userEmail}</div>
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
                      handleAvatarFileChange(e.target.files, onChange)
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
                        handleAvatarFileChange(e.target.files, onChange)
                      }
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
                      <div className="relative w-full h-72 bg-black/80 rounded-lg overflow-hidden">
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
                        <span className="text-sm text-muted-foreground">
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
