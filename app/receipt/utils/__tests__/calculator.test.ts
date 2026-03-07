import { describe, it, expect } from "vitest";
import { calculateBalances } from "../calculator";
import {
  ParticipantDTO,
  Receipt,
  ReceiptPosition,
} from "@/model/receipt/model";

describe("calculateBalances", () => {
  const participants: ParticipantDTO[] = [
    { id: "p1", displayName: "P1", color: "", kind: "MOCK" },
    { id: "p2", displayName: "P2", color: "", kind: "MOCK" },
  ];

  it("calculates quantity description for fixed amount claims", () => {
    const position: ReceiptPosition = {
      id: "pos1",
      name: "Item",
      price: 100,
      quantity: 2,
      overall: 200,
      claims: [
        {
          id: "claim-1",
          type: "amount",
          value: 50, // 50 RUB
          participantIds: ["p1"],
        },
      ],
    };

    const receipt = {
      id: "r1",
      positions: [position],
      totals: { total: 200, grandTotal: 200 },
      fees: [],
      discounts: [],
    } as unknown as Receipt;

    const balances = calculateBalances(receipt, participants);
    const p1Balance = balances.find((b) => b.participantId === "p1");

    expect(p1Balance).toBeDefined();
    expect(p1Balance?.items[0].description).toBe("0.5 × 100 ₽");
  });

  it("keeps finalAmount in two-decimal money precision", () => {
    const receipt = {
      id: "r1",
      positions: [
        {
          id: "pos1",
          name: "Item",
          price: 1620,
          quantity: 1,
          overall: 1620,
          claims: [
            {
              id: "claim-1",
              type: "quantity",
              value: 0.55,
              participantIds: ["p1"],
            },
          ],
        },
      ],
      totals: { total: 1620, grandTotal: 1620 },
      fees: [],
      discounts: [],
    } as unknown as Receipt;

    const balances = calculateBalances(receipt, participants);
    const p1Balance = balances.find((b) => b.participantId === "p1");

    expect(p1Balance?.baseAmount).toBe(891);
    expect(p1Balance?.finalAmount).toBe(891);
  });
});
