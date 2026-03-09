"use client";

import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { t } from "@/app/i18n/translations";
import {
  actionBar,
  iconSizeVariants,
} from "@/app/receipt/components/ui-styles";

interface SearchBarProps {
  isOpen: boolean;
  searchQuery: string;
  onSearchQueryChange?: (value: string) => void;
  onRequestClose?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  searchQuery,
  onSearchQueryChange,
  onRequestClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      suppressHydrationWarning={true}
      className={cn(
        "fixed inset-x-0 top-8 z-[45] transition-opacity duration-200",
        isOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      aria-hidden={!isOpen}
    >
      <div className="mx-auto w-full max-w-3xl px-5">
        <div
          className={cn(
            "relative h-16 overflow-hidden p-2",
            actionBar,
            "bg-white",
          )}
        >
          <div
            className={cn(
              "flex h-full w-full items-center gap-3 rounded-full px-4",
            )}
          >
            {isOpen ? (
              <>
                <input
                  type="text"
                  value={searchQuery}
                  autoFocus
                  onChange={(event) =>
                    onSearchQueryChange?.(event.target.value)
                  }
                  onBlur={(event) => {
                    if (event.target.value.trim()) return;
                    onRequestClose?.();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onSearchQueryChange?.("");
                      onRequestClose?.();
                    }
                  }}
                  className="pointer-events-auto min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none placeholder:text-muted-foreground/80"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onMouseDown={(event) => {
                    if (searchQuery.trim()) {
                      event.preventDefault();
                    }
                  }}
                  onClick={() => {
                    if (searchQuery.trim() && onSearchQueryChange) {
                      onSearchQueryChange("");
                      inputRef.current?.focus();
                      return;
                    }
                    onRequestClose?.();
                  }}
                  aria-label={t("close")}
                  title={t("close")}
                  className="relative h-10 w-10 rounded-full bg-foreground/5 text-foreground hover:bg-foreground/10 pointer-events-auto"
                >
                  <X
                    className={cn("absolute", iconSizeVariants({ size: "sm" }))}
                  />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
