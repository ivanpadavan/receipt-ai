import { afterEach, describe, expect, it, vi } from "vitest";
import { updateUserProfileClient } from "@/app/settings/update-user-profile-client";

describe("updateUserProfileClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts multipart payload to settings profile route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ avatarUrl: "https://example.com/a.jpg" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateUserProfileClient({ displayName: "Anton" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/settings/profile");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[0][1]?.body).toBeInstanceOf(FormData);
  });
});

