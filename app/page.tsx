"use client";

import type { ImageUploadCropperResult } from "@/app/components/image-upload-cropper";
import { pageState$ } from "@/app/state";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import {
  cardPaddingVariants,
  errorBox,
  loadingSpinner,
  screenShell,
  iconSizeVariants,
  inlineGapVariants,
  textVariants,
  previewImage,
  uploadPanel,
  btnShadow,
} from "@/app/receipt/components/ui-styles";
import { ImageUploadCropper } from "@/app/components/image-upload-cropper";
import { ActionBar } from "@/app/receipt/components/ui/ActionBar";
import { IconActionGroup } from "@/app/receipt/components/ui/IconActionGroup";

const createPastedImage = (imageBase64: string): ImageUploadCropperResult => ({
  aspect: 1,
  crop: { x: 0, y: 0 },
  croppedImageBase64: imageBase64,
  file: new File([], "pasted-image.jpg", { type: "image/jpeg" }),
  imageUrl: imageBase64,
  originalImageBase64: imageBase64,
  zoom: 1,
});

function ReceiptUploadPanel({
  compact = false,
  disabled = false,
  className,
  onClick,
}: {
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-center justify-center text-center disabled:cursor-not-allowed disabled:opacity-60",
        uploadPanel,
        compact
          ? "h-full min-h-0 w-full gap-0 bg-amber-50/70 px-6 py-4"
          : "h-full gap-4 px-6 py-8",
        className,
      )}
    >
      {compact ? (
        <div className="flex w-full items-center justify-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              iconSizeVariants({ size: "lg" }),
              textVariants({ tone: "muted" }),
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p
            className={cn(
              textVariants({ size: "base", weight: "semibold" }),
            )}
          >
            {t("addReceiptImage")}
          </p>
        </div>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "mb-1",
              iconSizeVariants({ size: "xl" }),
              textVariants({ tone: "muted" }),
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p
            className={cn(
              textVariants({ size: "lg", weight: "semibold" }),
            )}
          >
            {t("uploadReceiptImage")}
          </p>
        </>
      )}
      {!compact ? (
        <p
          className={cn(
            textVariants({ size: "sm", tone: "muted" }),
          )}
        >
          {t("tapToSelectOrPaste")}
        </p>
      ) : null}
    </button>
  );
}

export default function ImagePastePage() {
  const router = useRouter();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const imageButtonRefs = useRef<(HTMLDivElement | null)[]>([]);

  // eslint-disable-next-line react-hooks/use-memo
  const pageState = useObservable(useMemo(pageState$, []), forceSync);
  const { picture, navigateTo, error } = pageState;
  const images = picture.status === "idle" ? [] : picture.images;
  const loading = picture.status === "loading";

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || picture.status === "loading") return;

      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            if (event.target?.result && "appendPicture" in picture) {
              picture.appendPicture(
                createPastedImage(event.target.result as string),
              );
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [picture]);

  useEffect(() => {
    if (!navigateTo) return;
    router.push(navigateTo);
  }, [navigateTo, router]);

  useEffect(() => {
    if (editingIndex === null) {
      return;
    }

    if (editingIndex >= images.length || loading) {
      setEditingIndex(null);
    }
  }, [editingIndex, images.length, loading]);

  // scroll to new length
  useEffect(() => setActiveImageIndex(images.length - 1), [images.length]);
  // scroll on tap
  useEffect(() => {
    imageButtonRefs.current[activeImageIndex ?? -1]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
    });
  }, [activeImageIndex]);

  const handleUploadedImage = (result: ImageUploadCropperResult) => {
    if ("appendPicture" in picture) {
      picture.appendPicture({
        originalImageBase64: result.originalImageBase64,
        croppedImageBase64: result.croppedImageBase64,
        crop: result.crop,
        zoom: result.zoom,
        aspect: result.aspect,
      });
      error.setError("");
    }
  };

  return (
    <ImageUploadCropper
      title={t("cropReceiptImage")}
      aspect="dynamic"
      capture="environment"
      cropOnSelect={false}
      onError={(message) => error.setError(message)}
      onCropped={handleUploadedImage}
    >
      {({ captureSupported, openCameraPicker, openFilePicker }) => (
        <div className={cn("relative flex h-full flex-1 flex-col px-4 pt-4")}>
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="w-full max-w-md mx-auto">
              <h1
                className={cn(
                  "mb-6 text-center",
                  textVariants({
                    size: "3xl",
                    weight: "bold",
                    tone: "brandStrong",
                  }),
                )}
              >
                {t("receiptScannerTitle")}
              </h1>
              <div className="flex flex-col gap-4">
                <Card
                  variant="default"
                  shadow="md"
                  className={cn(
                    "relative overflow-hidden",
                    cardPaddingVariants({ size: "lg" }),
                  )}
                >
                  <ReceiptUploadPanel
                    disabled={loading}
                    onClick={openFilePicker}
                    className={cn(
                      "relative h-[320px]",
                      cardPaddingVariants({ size: "lg" }),
                    )}
                  />
                  {images.length > 0 && (
                    <div className="absolute inset-0 bg-white">
                      <div
                        className={cn(
                          "flex h-full gap-3 overflow-x-auto overflow-y-hidden p-4",
                          images.length === 1
                            ? "justify-center"
                            : "justify-start",
                        )}
                      >
                        {images.map((image, index) => (
                          <div
                            key={`${index}`}
                            ref={(node) => {
                              imageButtonRefs.current[index] = node;
                            }}
                            onClick={() => setActiveImageIndex(index)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setActiveImageIndex(index);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "relative h-full w-auto shrink-0 overflow-hidden rounded-xl transition-shadow",
                              activeImageIndex === index &&
                                "shadow-[0_0_0_3px_rgba(245,158,11,0.45)]",
                            )}
                          >
                            {activeImageIndex === index ? (
                              <div className="absolute right-3 bottom-3 z-10">
                                <IconActionGroup
                                  size="compact"
                                  className="border-0"
                                  actions={[
                                    {
                                      id: `edit-image-${index}`,
                                      label: t("editImage"),
                                      onClick: () => setEditingIndex(index),
                                      icon: (
                                        <Pencil
                                          className={iconSizeVariants({
                                            size: "sm",
                                          })}
                                        />
                                      ),
                                    },
                                    ...("removePicture" in picture
                                      ? [
                                          {
                                            id: `remove-image-${index}`,
                                            label: t("removeImage"),
                                            tone: "danger" as const,
                                            onClick: () =>
                                              picture.removePicture(index),
                                            icon: (
                                              <Trash2
                                                className={iconSizeVariants({
                                                  size: "sm",
                                                })}
                                              />
                                            ),
                                          },
                                        ]
                                      : []),
                                  ]}
                                />
                              </div>
                            ) : null}
                            <img
                              src={image.croppedImageBase64}
                              alt={`${t("receiptImageAlt")} ${index + 1}`}
                              className={cn(
                                "h-full w-auto max-w-none object-contain rounded-xl",
                                previewImage,
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
                <div className="flex h-full items-center justify-center">
                  {captureSupported && (
                    <Button
                      type="button"
                      onClick={openCameraPicker}
                      disabled={loading}
                      className={cn(
                        "flex items-center",
                        inlineGapVariants({ size: "sm" }),
                        btnShadow,
                      )}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={iconSizeVariants({ size: "md" })}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {t("takePhoto")}
                    </Button>
                  )}
                </div>
              </div>
              {editingIndex !== null && picture.status === "picture-in" ? (
                <ImageUploadCropper
                  title={t("cropReceiptImage")}
                  aspect="dynamic"
                  editSource={images[editingIndex]}
                  onClose={() => setEditingIndex(null)}
                  onError={(message) => error.setError(message)}
                  onCropped={(result) => {
                    picture.updatePicture(editingIndex, {
                      originalImageBase64: result.originalImageBase64,
                      croppedImageBase64: result.croppedImageBase64,
                      crop: result.crop,
                      zoom: result.zoom,
                      aspect: result.aspect,
                    });
                    setEditingIndex(null);
                  }}
                />
              ) : null}

              {loading ? (
                <div
                  className={cn(
                    "w-full flex flex-col items-center justify-center",
                    cardPaddingVariants({ size: "lg" }),
                  )}
                >
                  <div
                    className={cn(
                      "mb-4",
                      iconSizeVariants({ size: "xl" }),
                      loadingSpinner,
                    )}
                  />
                  <span className={textVariants({ size: "sm", tone: "brand" })}>
                    {t("processingReceipt")}
                  </span>
                </div>
              ) : null}

              {error.errorMessage && (
                <div className={cn("w-full mt-4", errorBox)}>
                  <p className="font-bold">{t("errorLabel")}</p>
                  <p>{error.errorMessage}</p>
                </div>
              )}
            </div>
          </div>
          <ActionBar
            className="sticky bottom-3"
            visible={images.length > 0}
            leadingActions={[
              {
                id: "clear-images",
                label: t("clearImage"),
                tone: "danger",
                disabled: !("clear" in picture) || loading,
                onClick: "clear" in picture ? picture.clear : undefined,
                icon: <X className={iconSizeVariants({ size: "sm" })} />,
              },
              {
                id: "add-image",
                label: t("addReceiptImage"),
                disabled: loading,
                onClick: openFilePicker,
                icon: <Plus className={iconSizeVariants({ size: "sm" })} />,
              },
            ]}
            onPrimaryAction={() => {
              if ("proceed" in picture) {
                picture.proceed();
              }
            }}
            canProceed={"proceed" in picture && !loading}
            primaryLabel="done"
          />
        </div>
      )}
    </ImageUploadCropper>
  );
}
