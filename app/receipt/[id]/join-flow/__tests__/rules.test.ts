import { describe, expect, it } from "vitest";
import {
  getJoinFlowState,
  getOfflineAnonymousCandidates,
} from "@/app/receipt/[id]/join-flow/rules";
import type { User } from "@supabase/supabase-js";

const makeUser = ({
  id,
  displayName,
}: {
  id: string;
  displayName?: string;
}) =>
  ({
    id,
    user_metadata: {
      ...(displayName ? { displayName } : {}),
    },
  }) as User;

describe("join-flow rules", () => {
  it("returns nothing when user is already a participant even without local display name", () => {
    const state = getJoinFlowState(
      [
        {
          id: "u-1",
          displayName: "Saved on server",
          color: "#111",
          kind: "REAL",
          isOnline: true,
        },
      ],
      makeUser({ id: "u-1" }),
    );

    expect(state).toBe("nothing");
  });

  it("keeps settings state when user has no display name in splitting mode", () => {
    const state = getJoinFlowState([], makeUser({ id: "u-1" }));
    expect(state).toBe("settings");
  });

  it("returns only offline anonymous real participants as candidates", () => {
    const candidates = getOfflineAnonymousCandidates(
      [
        {
          id: "u-1",
          displayName: "Current",
          color: "#000",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        },
        {
          id: "u-2",
          displayName: "Offline Anonymous",
          color: "#111",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        },
        {
          id: "u-3",
          displayName: "Online Anonymous",
          color: "#222",
          kind: "REAL",
          isAnonymous: true,
          isOnline: true,
        },
        {
          id: "u-4",
          displayName: "Offline Named",
          color: "#333",
          kind: "REAL",
          isAnonymous: false,
          isOnline: false,
        },
        {
          id: "m-1",
          displayName: "Mock",
          color: "#444",
          kind: "MOCK",
        },
      ],
      makeUser({ id: "u-1" }),
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe("u-2");
  });
});
