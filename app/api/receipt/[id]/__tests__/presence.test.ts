import { describe, expect, it, vi } from "vitest";
import { trackPresenceAndSync } from "@/app/api/receipt/[id]/trackPresenceAndSync";

describe("trackPresenceAndSync", () => {
  it("tracks current user and then synchronizes presence state", async () => {
    const order: string[] = [];
    const channel = {
      track: vi.fn(async () => {
        order.push("track");
      }),
    };
    const syncPresenceState = vi.fn(() => {
      order.push("sync");
    });

    await trackPresenceAndSync(channel, "user-1", syncPresenceState);

    expect(channel.track).toHaveBeenCalledWith({ userId: "user-1" });
    expect(syncPresenceState).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["track", "sync"]);
  });
});
