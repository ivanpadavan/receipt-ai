import { describe, expect, it } from "vitest";
import type { ParticipantDTO } from "@/model/receipt/model";
import { prioritizeCurrentUserParticipant } from "@/app/receipt/components/SplittingSheet/prioritizeCurrentUserParticipant";

describe("prioritizeCurrentUserParticipant", () => {
  it("moves current user participant to the first position", () => {
    const participants: ParticipantDTO[] = [
      { id: "p-1", displayName: "Anton", color: "#111", kind: "REAL" },
      { id: "p-2", displayName: "Me", color: "#222", kind: "REAL" },
      { id: "p-3", displayName: "Polina", color: "#333", kind: "REAL" },
    ];

    expect(
      prioritizeCurrentUserParticipant(participants, "p-2").map(
        (participant) => participant.id,
      ),
    ).toEqual(["p-2", "p-1", "p-3"]);
  });

  it("keeps original order when current user is already first or absent", () => {
    const participants: ParticipantDTO[] = [
      { id: "p-1", displayName: "Me", color: "#111", kind: "REAL" },
      { id: "p-2", displayName: "Anton", color: "#222", kind: "REAL" },
    ];

    expect(prioritizeCurrentUserParticipant(participants, "p-1")).toEqual(
      participants,
    );
    expect(prioritizeCurrentUserParticipant(participants, "missing")).toEqual(
      participants,
    );
  });
});
