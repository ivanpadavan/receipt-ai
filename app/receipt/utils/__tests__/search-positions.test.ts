import { describe, expect, it } from "vitest";
import { ReceiptPosition } from "@/model/receipt/model";
import { searchPositionsForDisplay } from "@/app/receipt/utils/search-positions";

describe("searchPositionsForDisplay", () => {
  const positions: ReceiptPosition[] = [
    {
      id: "filled-later",
      name: "Milk 2.5%",
      quantity: 1,
      price: 120,
      overall: 120,
      claims: [
        {
          id: "claim-1",
          participantIds: ["p1"],
          type: "quantity",
          value: 1,
        },
      ],
    },
    {
      id: "open-first",
      name: "Bread sourdough",
      quantity: 1,
      price: 90,
      overall: 90,
      claims: [],
    },
    {
      id: "open-second",
      name: "Mineral water",
      quantity: 1,
      price: 70,
      overall: 70,
      claims: [],
    },
  ];

  it("returns all positions in original order when query is empty", () => {
    expect(searchPositionsForDisplay(positions, "")).toEqual([
      { position: positions[0], originalIndex: 0 },
      { position: positions[1], originalIndex: 1 },
      { position: positions[2], originalIndex: 2 },
    ]);
  });

  it("returns fuzzy matches with original indices preserved", () => {
    expect(searchPositionsForDisplay(positions, "mlk")).toEqual([
      { position: positions[0], originalIndex: 0 },
    ]);
  });

  it("matches single-character queries by substring", () => {
    expect(searchPositionsForDisplay(positions, "m")).toEqual([
      { position: positions[0], originalIndex: 0 },
      { position: positions[2], originalIndex: 2 },
    ]);
  });

  it("returns no matches when nothing fits the query", () => {
    expect(searchPositionsForDisplay(positions, "coffee")).toEqual([]);
  });
});
