import { describe, it, expect } from "vitest";
import { calculateBalances } from "../calculator";
import { Receipt, ReceiptPosition, ReceiptParticipant } from "@/model/receipt/model";

describe("calculateBalances", () => {
    const participants: ReceiptParticipant[] = [
        { id: "p1", name: "P1", color: "" },
        { id: "p2", name: "P2", color: "" }
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
                    type: "amount",
                    value: 50, // 50 RUB
                    participantIds: ["p1"]
                }
            ]
        };

        const receipt = {
            id: "r1",
            positions: [position],
            participants,
            totals: { total: 200, grandTotal: 200, discount: 0, fee: 0 },
            fees: [],
            discounts: [],
            date: new Date(),
            editingFinished: true
        } as unknown as Receipt;

        const balances = calculateBalances(receipt);
        const p1Balance = balances.find(b => b.participantId === "p1");

        expect(p1Balance).toBeDefined();
        expect(p1Balance?.items[0].description).toBe("0.5 × 100 ₽");
    });
});
