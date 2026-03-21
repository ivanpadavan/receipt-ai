import { NextRequest } from "next/server";
import { finalize, fromEvent, Observable, Subscription, takeUntil } from "rxjs";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

interface SseController {
  enqueue: (chunk: Uint8Array) => void;
  close: () => void;
}

export interface SseWriter {
  sendData: (payload: unknown) => void;
}

type SseStartCallback = (
  writer: SseWriter,
) => Observable<unknown>;

function encodeSseMessage(message: string) {
  return new TextEncoder().encode(message);
}

function sendSseConnectionEstablished(controller: Pick<SseController, "enqueue">) {
  controller.enqueue(encodeSseMessage("data: connection established\n\n"));
}

function sendSseHeartbeat(controller: Pick<SseController, "enqueue">) {
  controller.enqueue(encodeSseMessage(": heartbeat\n\n"));
}

function sendSseData(controller: Pick<SseController, "enqueue">, payload: unknown) {
  controller.enqueue(encodeSseMessage(`data: ${JSON.stringify(payload)}\n\n`));
}

function createSseWriter(controller: SseController): SseWriter {
  return {
    sendData: (payload) => sendSseData(controller, payload),
  };
}

export function createSseResponse(
  req: NextRequest,
  start: SseStartCallback,
  options?: { heartbeatMs?: number },
) {
  const heartbeatMs = options?.heartbeatMs ?? 20000;

  let clearHeartbeat: (() => void) | undefined;
  let subscription: Subscription | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const writer = createSseWriter(controller);
      let isClosed = false;
      const closeController = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };

      sendSseConnectionEstablished(controller);

      const heartbeat = setInterval(() => {
        try {
          sendSseHeartbeat(controller);
        } catch {
          // stream already closed
        }
      }, heartbeatMs);
      clearHeartbeat = () => clearInterval(heartbeat);

      const obs = await start(writer);

      subscription = obs.pipe(
        finalize(() => {
          clearHeartbeat?.();
          closeController();
        }),
        takeUntil(fromEvent(req.signal, "abort")),
      ).subscribe();
    },
    async cancel() {
      subscription?.unsubscribe();
    },
  });

  return new Response(stream, {
    headers: SSE_HEADERS,
  });
}
