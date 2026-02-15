"use client";

import { pageState$ } from "@/app/state";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { useEffect, useMemo, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
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

const captureSupported =
  typeof document === "object" &&
  document.createElement("input").capture != undefined;

export default function ImagePastePage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/use-memo
  const pageState = useObservable(useMemo(pageState$, []), forceSync);
  const { picture, navigateTo, error } = pageState;

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || picture.status !== "idle") return;

      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            if (event.target?.result && picture.status === "idle") {
              picture.appendPicture(event.target.result as string);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the file is an image
    if (!file.type.startsWith("image/")) {
      error.setError(t("selectImageFileError"));
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result && picture.status === "idle") {
          picture.appendPicture(event.target.result as string);
          error.setError("");
        }
        e.target.value = "";
      };
      reader.readAsDataURL(file);
    } catch (err) {
      error.setError(
        err instanceof Error
          ? err.message
          : t("fileReadError"),
      );
      console.error("Error reading file:", err);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col items-center justify-center flex-1 gap-4",
          screenShell,
        )}
      >
        <div className="w-full max-w-md mx-auto">
          <h1
            className={cn(
              "mb-6 text-center",
              textVariants({ size: "3xl", weight: "bold", tone: "brandStrong" }),
            )}
          >
            {t("receiptScannerTitle")}
          </h1>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {picture.status === "picture-in" && (
            <Card
              variant="interactive"
              shadow="md"
              className={cn(
                "flex w-full flex-col items-center gap-4",
                cardPaddingVariants({ size: "md" }),
              )}
            >
              <img
                src={picture.imageBase64}
                alt={t("receiptImageAlt")}
                className={cn(
                  "max-w-full max-h-[400px]",
                  previewImage,
                )}
              />
              <div
                className={cn(
                  "flex flex-wrap justify-center w-full",
                  inlineGapVariants({ size: "sm" }),
                )}
              >
                <Button
                  onClick={picture.clear}
                  variant="destructive"
                >
                  {t("clearImage")}
                </Button>
                <Button
                  onClick={() => {
                    picture.proceed();
                  }}
                >
                  {t("extractReceiptData")}
                </Button>
              </div>
            </Card>
          )}
          {picture.status === "idle" && (
            <Card
              variant="default"
              shadow="md"
              className={cardPaddingVariants({ size: "lg" })}
            >
              <div
                className={cn(
                  "w-full min-h-[200px] flex flex-col items-center justify-center",
                  uploadPanel,
                  cardPaddingVariants({ size: "lg" }),
                  "cursor-pointer",
                )}
                onClick={triggerFileInput}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={cn(
                    "mb-4",
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
                    "mb-2 text-center",
                    textVariants({ size: "lg", weight: "semibold" }),
                  )}
                >
                  {t("uploadReceiptImage")}
                </p>
                <p
                  className={cn(
                    "text-center",
                    textVariants({ size: "sm", tone: "muted" }),
                  )}
                >
                  {t("tapToSelectOrPaste")}
                </p>
              </div>
              {captureSupported && (
                <div className="mt-4 flex justify-center">
                  <Button
                    asChild
                    className={cn(
                      "flex items-center cursor-pointer",
                      inlineGapVariants({ size: "sm" }),
                      buttonVariants(),
                      btnShadow,
                    )}
                  >
                    <label>
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                      />
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
                      {t("takeAvatarPhoto")}
                    </label>
                  </Button>
                </div>
              )}
            </Card>
          )}

          {picture.status === "loading" && (
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
              <span
                className={textVariants({ size: "sm", tone: "brand" })}
              >
                {t("processingReceipt")}
              </span>
            </div>
          )}

          {error.errorMessage && (
            <div className={cn("w-full mt-4", errorBox)}>
              <p className="font-bold">{t("errorLabel")}</p>
              <p>{error.errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
