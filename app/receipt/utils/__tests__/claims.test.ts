import { describe, expect, it } from "vitest";
import type { ReceiptPosition } from "@/model/receipt/model";
import {
  comparePositionsByFillState,
  getClaimAmount,
  isPositionFilled,
  sortPositionsForDisplay,
} from "@/app/receipt/utils/claims";

const createPosition = (claims: ReceiptPosition["claims"]): ReceiptPosition => ({
  id: "p-1",
  name: "Item",
  quantity: 2,
  price: 50,
  overall: 100,
  claims,
});

describe("isPositionFilled", () => {
  it("calculates quantity claim amount using cent-safe arithmetic", () => {
    expect(
      getClaimAmount(
        { id: "c-1", type: "quantity", value: 0.55, participantIds: ["u-1"] },
        1620,
      ),
    ).toBe(891);
  });

  it("returns true when amount claims fully cover overall", () => {
    const position = createPosition([
      { id: "c-1", type: "amount", value: 100, participantIds: ["u-1"] },
    ]);

    expect(isPositionFilled(position)).toBe(true);
  });

  it("returns false when overall is not fully distributed", () => {
    const position = createPosition([
      { id: "c-1", type: "amount", value: 60, participantIds: ["u-1"] },
    ]);

    expect(isPositionFilled(position)).toBe(false);
  });
});

describe("comparePositionsByFillState", () => {
  it("puts unfilled positions before filled", () => {
    const filled = createPosition([
      { id: "c-1", type: "amount", value: 100, participantIds: ["u-1"] },
    ]);
    const unfilled = createPosition([
      { id: "c-1", type: "amount", value: 20, participantIds: ["u-1"] },
    ]);

    expect(comparePositionsByFillState(unfilled, filled)).toBeLessThan(0);
    expect(comparePositionsByFillState(filled, unfilled)).toBeGreaterThan(0);
  });
});

describe("sortPositionsForDisplay", () => {
  it("keeps original indices after sorting by fill state", () => {
    const unfilledFirst = createPosition([
      { id: "c-1", type: "amount", value: 20, participantIds: ["u-1"] },
    ]);
    const filledSecond = createPosition([
      { id: "c-2", type: "amount", value: 100, participantIds: ["u-1"] },
    ]);

    const sorted = sortPositionsForDisplay([filledSecond, unfilledFirst]);

    expect(sorted[0].position).toBe(unfilledFirst);
    expect(sorted[0].originalIndex).toBe(1);
    expect(sorted[1].position).toBe(filledSecond);
    expect(sorted[1].originalIndex).toBe(0);
  });
});
