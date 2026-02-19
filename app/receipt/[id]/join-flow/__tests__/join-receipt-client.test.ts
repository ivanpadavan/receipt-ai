import { afterEach, describe, expect, it, vi } from "vitest";
import { joinReceiptClient } from "@/app/receipt/[id]/join-flow/join-receipt-client";

describe("joinReceiptClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends replaceParticipantId when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal("fetch", fetchMock);

    await joinReceiptClient("receipt-1", {
      replaceParticipantId: "participant-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/receipt/receipt-1/participants/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceParticipantId: "participant-1" }),
      },
    );
  });
});
