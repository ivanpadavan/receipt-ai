"use client";

import { useCallback } from "react";

export const useIOSDoneOnBlur = (
  onDone: () => void,
  canDone: () => boolean = () => true,
) =>
  useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    if (event.relatedTarget !== null) {
      return;
    }

    if (!canDone()) {
      return;
    }

    onDone();
  }, [canDone, onDone]);

