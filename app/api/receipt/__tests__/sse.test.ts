import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Observable } from "rxjs";
import {
  createSseResponse,
  SSE_HEADERS,
} from "@/app/api/receipt/sse";

async function readChunk(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Missing response body");
  }
  const result = await reader.read();
  return {
    text: result.value ? Buffer.from(result.value).toString("utf8") : "",
    reader,
  };
}

describe("receipt SSE helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates an SSE response with headers, connection message, data, and heartbeat", async () => {
    const response = createSseResponse(new NextRequest("http://localhost/api/test"), (stream) => {
      stream.sendData({ ok: true });
      return new Observable(() => undefined);
    }, { heartbeatMs: 1000 });

    const { reader, text: firstChunk } = await readChunk(response);
    expect(firstChunk).toBe("data: connection established\n\n");

    const secondChunkPromise = reader.read();
    await vi.advanceTimersByTimeAsync(0);
    const secondChunk = await secondChunkPromise;
    expect(Buffer.from(secondChunk.value ?? new Uint8Array()).toString("utf8")).toBe(
      "data: {\"ok\":true}\n\n",
    );

    const thirdChunkPromise = reader.read();
    await vi.advanceTimersByTimeAsync(1000);
    const thirdChunk = await thirdChunkPromise;
    expect(Buffer.from(thirdChunk.value ?? new Uint8Array()).toString("utf8")).toBe(
      ": heartbeat\n\n",
    );
    await reader.cancel();
  });

  it("exports SSE response headers", () => {
    expect(SSE_HEADERS).toEqual({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  });
});
