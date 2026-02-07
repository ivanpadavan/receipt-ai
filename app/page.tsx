"use client";

import { pageState$ } from "@/app/state";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

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
      error.setError("Please select an image file");
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
          : "An error occurred while reading the file",
      );
      console.error("Error reading file:", err);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center flex-1 p-4 gap-4 bg-amber-50">
        <div className="w-full max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center text-amber-800">
            Receipt Scanner
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
            <Card variant="interactive" shadow="md" className="flex w-full flex-col items-center gap-4 p-4">
              <img
                src={picture.imageBase64}
                alt="Receipt image"
                className="max-w-full max-h-[400px] object-contain rounded-md"
              />
              <div className="flex flex-wrap gap-2 justify-center w-full">
                <Button
                  onClick={picture.clear}
                  variant="destructive"
                  className="shadow-md"
                >
                  Clear Image
                </Button>
                <Button
                  onClick={() => {
                    picture.proceed();
                  }}
                  className="shadow-md"
                >
                  Extract Receipt Data
                </Button>
              </div>
            </Card>
          )}
          {picture.status === "idle" && (
            <Card variant="default" shadow="md" className="p-6">
              <div
                className="w-full border-2 border-dashed border-input rounded-lg p-6 min-h-[200px] flex flex-col items-center justify-center cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={triggerFileInput}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-muted-foreground mb-4"
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
                <p className="text-lg font-medium text-foreground mb-2">
                  Upload Receipt Image
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Tap to select from gallery or paste from clipboard
                </p>
              </div>
              {captureSupported && (
                <div className="mt-4 flex justify-center">
                  <Button
                    asChild
                    className="shadow-md flex items-center gap-2 cursor-pointer"
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
                        className="h-5 w-5"
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
                      Take Photo
                    </label>
                  </Button>
                </div>
              )}
            </Card>
          )}

          {picture.status === "loading" && (
            <div className="w-full flex flex-col items-center justify-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
              <span className="text-amber-800 text-sm font-medium">
                Processing receipt...
              </span>
            </div>
          )}

          {error.errorMessage && (
            <div className="w-full mt-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg shadow-sm">
              <p className="font-bold">Error:</p>
              <p>{error.errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
