"use client";

import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { isEqual } from "lodash-es";
import { useMemo } from "react";
import {
  distinctUntilChanged,
  fromEvent,
  merge,
  Observable,
  retry,
  startWith,
  take,
  timer,
} from "rxjs";
import type { ZodTypeAny } from "zod";

interface SseEventSourceLike {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  close: () => void;
}

interface CreateSseResourceObservableOptions<T> {
  initialData: T;
  url: string;
  schema: ZodTypeAny;
  createEventSource?: (url: string) => SseEventSourceLike;
}

interface UseSseResourceOptions<T> extends CreateSseResourceObservableOptions<T> {
  connectionToastId: string;
}

function createSseConnectionObservable<T>({
  initialData,
  url,
  schema,
  onOpen,
  createEventSource = (nextUrl) => new EventSource(nextUrl),
}: CreateSseResourceObservableOptions<T> & {
  onOpen?: () => void;
}) {
  return new Observable<T>((handler) => {
    if (typeof window === "undefined") {
      handler.next(initialData);
      handler.complete();
      return;
    }

    const eventSource = createEventSource(url);

    eventSource.onopen = () => {
      onOpen?.();
    };

    eventSource.onmessage = (event) => {
      if (event.data === "connection established") return;
      const parsed = schema.safeParse(JSON.parse(event.data));
      if (parsed.success) {
        handler.next(parsed.data as T);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      handler.error(new Error("sse disconnected"));
    };

    return () => {
      eventSource.close();
    };
  });
}

export function createSseResourceObservable<T>(
  options: CreateSseResourceObservableOptions<T>,
) {
  return createSseConnectionObservable(options).pipe(
    startWith(options.initialData),
    distinctUntilChanged(isEqual),
  );
}

export function useSseResource<T>({
  initialData,
  url,
  schema,
}: UseSseResourceOptions<T>) {
  return useObservable<Observable<T>>(
    useMemo(() => {
      return createSseConnectionObservable({
        initialData,
        url,
        schema,
      }).pipe(
        retry({
          delay: (_error, retryCount) => {
            const delayMs = Math.min(1000 * 2 ** (retryCount - 1), 10_000);
            return merge(timer(delayMs), fromEvent(window, "online")).pipe(
              take(1),
            );
          },
        }),
        startWith(initialData),
        distinctUntilChanged(isEqual),
      );
    }, [initialData, schema, url]),
    forceSync,
  );
}
