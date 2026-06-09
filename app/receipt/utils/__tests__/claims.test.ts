import { describe, expect, it } from "vitest";
import type { ReceiptPosition } from "@/model/receipt/model";
import {
  comparePositionsByFillState,
  findMyQuantityClaim,
  getClaimAmount,
  getMyInlineMaxQuantity,
  isPositionFilled,
  setMyQuantity,
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

describe("inline (current-user) share helpers", () => {
  const withClaims = (claims: ReceiptPosition["claims"]): ReceiptPosition => ({
    id: "p-1",
    name: "Bread",
    quantity: 2,
    price: 150,
    overall: 300,
    claims,
  });

  it("finds only the current user's solo quantity claim", () => {
    const position = withClaims([
      { id: "mine", type: "quantity", value: 1, participantIds: ["u-1"] },
      { id: "shared", type: "quantity", value: 1, participantIds: ["u-1", "u-2"] },
      { id: "amount", type: "amount", value: 50, participantIds: ["u-1"] },
    ]);

    expect(findMyQuantityClaim(position.claims, "u-1")?.id).toBe("mine");
    expect(findMyQuantityClaim(position.claims, "u-3")).toBeUndefined();
    expect(findMyQuantityClaim(position.claims, undefined)).toBeUndefined();
  });

  it("caps max quantity by what others already claimed (amount-based)", () => {
    const position = withClaims([
      { id: "other", type: "amount", value: 150, participantIds: ["u-2"] },
    ]);

    expect(getMyInlineMaxQuantity(position, "u-1")).toBe(1);
  });

  it("excludes the user's own claim from the others total", () => {
    const position = withClaims([
      { id: "mine", type: "quantity", value: 1, participantIds: ["u-1"] },
      { id: "other", type: "amount", value: 150, participantIds: ["u-2"] },
    ]);

    expect(getMyInlineMaxQuantity(position, "u-1")).toBe(1);
  });

  it("returns 0 max quantity when fully claimed by others or price is zero", () => {
    expect(
      getMyInlineMaxQuantity(
        withClaims([{ id: "o", type: "amount", value: 300, participantIds: ["u-2"] }]),
        "u-1",
      ),
    ).toBe(0);
    expect(
      getMyInlineMaxQuantity({ ...withClaims([]), price: 0 }, "u-1"),
    ).toBe(0);
  });

  it("adds, updates and removes the current user's quantity claim", () => {
    const base = withClaims([
      { id: "other", type: "amount", value: 150, participantIds: ["u-2"] },
    ]);

    const added = setMyQuantity(base, "u-1", 1);
    const mine = findMyQuantityClaim(added.claims, "u-1");
    expect(mine?.value).toBe(1);
    expect(added.claims).toHaveLength(2);

    const updated = setMyQuantity(added, "u-1", 2);
    expect(findMyQuantityClaim(updated.claims, "u-1")?.value).toBe(2);
    expect(updated.claims).toHaveLength(2);

    const removed = setMyQuantity(updated, "u-1", 0);
    expect(findMyQuantityClaim(removed.claims, "u-1")).toBeUndefined();
    expect(removed.claims).toHaveLength(1);
  });

  it("preserves other claims and ignores a missing user", () => {
    const base = withClaims([
      { id: "other", type: "amount", value: 150, participantIds: ["u-2"] },
    ]);

    expect(setMyQuantity(base, undefined, 1)).toBe(base);
    expect(setMyQuantity(base, "u-1", 0)).toBe(base);
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
