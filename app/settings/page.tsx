"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);

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

          <Button type="submit" disabled={!displayName?.trim() || saving || isSubmitting}>
            {saving || isSubmitting ? t("saving") : t("save")}
          </Button>
        </form>
      </div>
    </div>
  );
}
