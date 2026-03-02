import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ParticipantDTO, ReceiptPosition } from "@/model/receipt/model";
import { useSplittingLogic } from "@/app/receipt/components/SplittingSheet/useSplittingLogic";

const participants: ParticipantDTO[] = [
  { id: "u-1", displayName: "Anton", color: "#f59e0b", kind: "REAL" },
];

const createPosition = (claims: ReceiptPosition["claims"]): ReceiptPosition => ({
  id: "p-1",
  name: "Coffee",
  quantity: 2,
  price: 50,
  overall: 100,
  claims,
});

describe("useSplittingLogic", () => {
  it("does not create default draft for fully distributed position", () => {
    const position = createPosition([
      { id: "c-1", type: "amount", value: 100, participantIds: ["u-1"] },
    ]);

    const { result } = renderHook(() =>
      useSplittingLogic({
        initialValue: position,
        onSave: vi.fn(),
        currentUser: { id: "u-1" },
        participants,
      }),
    );

    expect(result.current.activeDraftId).toBeNull();
    expect(result.current.draftClaim).toBeNull();
  });

  it("creates default draft for not fully distributed position", () => {
    const position = createPosition([
      { id: "c-1", type: "amount", value: 40, participantIds: ["u-1"] },
    ]);

    const { result } = renderHook(() =>
      useSplittingLogic({
        initialValue: position,
        onSave: vi.fn(),
        currentUser: { id: "u-1" },
        participants,
      }),
    );

    expect(result.current.activeDraftId).toBe("new");
    expect(result.current.draftClaim).not.toBeNull();
  });
});
