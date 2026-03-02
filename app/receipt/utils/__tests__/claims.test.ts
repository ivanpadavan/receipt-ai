import { describe, expect, it } from "vitest";
import type { ReceiptPosition } from "@/model/receipt/model";
import {
  comparePositionsByFillState,
  isPositionFilled,
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
