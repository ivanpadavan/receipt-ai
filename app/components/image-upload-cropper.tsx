"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/utils/cn";
import { t } from "@/app/i18n/translations";
import {
  dialogBodySpacing,
  dialogContentWide,
  dialogFooter,
  dialogHeader,
  dialogHeaderTitle,
  inlineGapVariants,
  radiusTokens,
  textVariants,
} from "@/app/receipt/components/ui-styles";

const cropFrame = `bg-black/80 ${radiusTokens.lg} overflow-hidden`;

const aspectToSliderValue = (value: number) =>
  value >= 1 ? value : -1 / value;

const minDynamicAspect = 1 / 3;
const maxDynamicAspect = 3;
const minAspectSliderValue = aspectToSliderValue(minDynamicAspect);
const maxAspectSliderValue = aspectToSliderValue(maxDynamicAspect);

const captureSupported = true;

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const clampAspect = (value: number) =>
  Math.min(maxDynamicAspect, Math.max(minDynamicAspect, value));

const sliderValueToAspect = (value: number) =>
  value >= 0 ? Math.max(1, value) : 1 / Math.abs(value);

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

const readFileAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("File read failed"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });

interface CropperRenderProps {
  captureSupported: boolean;
  openCameraPicker: () => void;
  openFilePicker: () => void;
}

export interface ImageUploadCropperEditSource {
  originalImageBase64: string;
  crop: { x: number; y: number };
  zoom: number;
  aspect: number;
}

export interface ImageUploadCropperResult {
  aspect: number;
  crop: { x: number; y: number };
  croppedImageBase64: string;
  file: File;
  imageUrl: string;
  originalImageBase64: string;
  zoom: number;
}

interface ImageUploadCropperProps {
  aspect: number | "dynamic";
  capture?: "environment" | "user";
  children?: (props: CropperRenderProps) => ReactNode;
  cropOnSelect?: boolean;
  cropShape?: "rect" | "round";
  editSource?: ImageUploadCropperEditSource | null;
  onClose?: () => void;
  onCropped: (result: ImageUploadCropperResult) => void | Promise<void>;
  onError?: (message: string) => void;
  title: string;
}

export function ImageUploadCropper({
  aspect,
  capture,
  children,
  cropOnSelect = true,
  cropShape = "rect",
  editSource,
  onClose,
  onCropped,
  onError,
  title,
}: ImageUploadCropperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const editSignatureRef = useRef<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [originalImageBase64, setOriginalImageBase64] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dynamicAspect, setDynamicAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const effectiveAspect = aspect === "dynamic" ? dynamicAspect : aspect;

  const resetCropState = useCallback((notifyClose = true) => {
    setCropOpen(false);
    setCropImage(null);
    setOriginalImageBase64(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setDynamicAspect(1);
    setCroppedAreaPixels(null);
    setPendingFileName(null);
    if (notifyClose) {
      editSignatureRef.current = null;
      onClose?.();
    }
  }, [onClose]);

  const openCropper = useCallback(async ({
    imageBase64,
    fileName,
    initialAspect,
    initialCrop,
    initialZoom,
  }: {
    fileName?: string;
    imageBase64: string;
    initialAspect?: number;
    initialCrop?: { x: number; y: number };
    initialZoom?: number;
  }) => {
    setOriginalImageBase64(imageBase64);
    setCropImage(imageBase64);
    setCrop(initialCrop ?? { x: 0, y: 0 });
    setZoom(initialZoom ?? 1);
    setPendingFileName(fileName ?? null);
    if (aspect === "dynamic") {
      if (typeof initialAspect === "number") {
        setDynamicAspect(clampAspect(initialAspect));
      } else {
        const image = await createImage(imageBase64);
        setDynamicAspect(clampAspect(image.naturalWidth / image.naturalHeight));
      }
    }
    setCropOpen(true);
  }, [aspect]);

  const handleSelectedFile = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      onError?.(t("selectImageFileError"));
      return;
    }

    try {
      const imageUrl = await readFileAsDataUrl(file);
      if (!cropOnSelect) {
        let initialAspect: number;
        if (aspect === "dynamic") {
          const image = await createImage(imageUrl);
          initialAspect = clampAspect(image.naturalWidth / image.naturalHeight);
        } else {
          initialAspect = aspect;
        }

        await onCropped({
          aspect: initialAspect,
          crop: { x: 0, y: 0 },
          croppedImageBase64: imageUrl,
          file,
          imageUrl,
          originalImageBase64: imageUrl,
          zoom: 1,
        });
        return;
      }

      await openCropper({
        imageBase64: imageUrl,
        fileName: file.name,
      });
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error.message
          : t("fileReadError"),
      );
    }
  }, [aspect, cropOnSelect, onCropped, onError, openCropper]);

  useEffect(() => {
    if (!editSource) {
      return;
    }

    const signature = JSON.stringify(editSource);
    if (editSignatureRef.current === signature) {
      return;
    }

    editSignatureRef.current = signature;
    void openCropper({
      imageBase64: editSource.originalImageBase64,
      initialAspect: editSource.aspect,
      initialCrop: editSource.crop,
      initialZoom: editSource.zoom,
    });
  }, [editSource, openCropper]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleApplyCrop = useCallback(async () => {
    if (!cropImage || !croppedAreaPixels || !originalImageBase64) {
      return;
    }

    try {
      const blob = await getCroppedBlob(cropImage, croppedAreaPixels);
      const fileName = pendingFileName || "image.jpg";
      const file = new File([blob], fileName, { type: blob.type });
      const imageUrl = await readFileAsDataUrl(blob);
      await onCropped({
        aspect: effectiveAspect,
        crop,
        croppedImageBase64: imageUrl,
        file,
        imageUrl,
        originalImageBase64,
        zoom,
      });
      resetCropState();
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error.message
          : t("fileReadError"),
      );
    }
  }, [
    crop,
    cropImage,
    croppedAreaPixels,
    effectiveAspect,
    onCropped,
    onError,
    originalImageBase64,
    pendingFileName,
    resetCropState,
    zoom,
  ]);

  const renderProps = useMemo(() => ({
    captureSupported: Boolean(capture && captureSupported),
    openCameraPicker: () => cameraInputRef.current?.click(),
    openFilePicker: () => fileInputRef.current?.click(),
  }), [capture]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleSelectedFile(event.target.files?.item(0) || null);
          event.target.value = "";
        }}
      />
      {capture && captureSupported ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture={capture}
          className="hidden"
          onChange={(event) => {
            void handleSelectedFile(event.target.files?.item(0) || null);
            event.target.value = "";
          }}
        />
      ) : null}

      {children?.(renderProps) ?? null}

      <AlertDialog
        open={cropOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetCropState();
            return;
          }
          setCropOpen(open);
        }}
      >
        <AlertDialogContent className={dialogContentWide}>
          <AlertDialogHeader className={dialogHeader}>
            <AlertDialogTitle className={dialogHeaderTitle}>
              {title}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div
            className={cn(dialogBodySpacing, "relative h-72 w-full", cropFrame)}
          >
            {cropImage ? (
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={effectiveAspect}
                cropShape={cropShape}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </div>
          <div
            className={cn(
              "flex items-center",
              inlineGapVariants({ size: "md" }),
            )}
          >
            <span className={textVariants({ size: "sm", tone: "muted" })}>
              {t("zoom")}
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full"
            />
          </div>
          {aspect === "dynamic" ? (
            <div
              className={cn(
                "flex items-center",
                inlineGapVariants({ size: "md" }),
              )}
            >
              <span className={textVariants({ size: "sm", tone: "muted" })}>
                {t("aspectRatio")}
              </span>
              <input
                type="range"
                min={minAspectSliderValue}
                max={maxAspectSliderValue}
                step={0.05}
                value={aspectToSliderValue(dynamicAspect)}
                onChange={(event) =>
                  setDynamicAspect(
                    clampAspect(sliderValueToAspect(Number(event.target.value))),
                  )
                }
                className="w-full"
              />
            </div>
          ) : null}
          <AlertDialogFooter
            className={cn(dialogFooter, inlineGapVariants({ size: "sm" }))}
          >
            <AlertDialogCancel onClick={() => resetCropState()}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleApplyCrop()}>
              {t("save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
