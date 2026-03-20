import { describe, expect, it } from "vitest";
import { t } from "@/app/i18n/translations";
import { applyStructuralPreview, buildStructuralLossWarnings } from "@/app/receipt/components/AiChat/structural-apply";
import type { Receipt } from "@/model/receipt/model";

const participants = [
  {
    id: "participant-1",
    displayName: "Ivan",
    color: "#111111",
    kind: "REAL" as const,
    isAnonymous: false,
    isOnline: true,
  },
];

describe("structural-apply", () => {
  it("preserves claims on matched rows and creates empty claims for new rows", () => {
    const currentReceipt: Receipt = {
      meta: { title: "Receipt", currencySymbol: "₽" },
      positions: [
        {
          id: "pos-1",
          name: "Burger",
          price: 100,
          quantity: 1,
          overall: 100,
          claims: [
            {
              id: "claim-1",
              participantIds: ["participant-1"],
              type: "quantity",
              value: 1,
            },
          ],
        },
      ],
      fees: [],
      discounts: [],
      totals: { total: 100, grandTotal: 100 },
    };

    const nextReceipt = applyStructuralPreview(currentReceipt, {
      meta: { title: "Receipt draft", currencySymbol: "₽" },
      positions: [
        {
          id: "pos-1",
          name: "Burger",
          price: 120,
          quantity: 1,
          overall: 120,
        },
        {
          name: "Fries",
          price: 50,
          quantity: 1,
          overall: 50,
        },
      ],
      fees: [],
      discounts: [],
      totals: { total: 170, grandTotal: 170 },
    });

    expect(nextReceipt.meta.title).toBe("Receipt draft");
    expect(nextReceipt.positions[0].id).toBe("pos-1");
    expect(nextReceipt.positions[0].claims).toEqual(currentReceipt.positions[0].claims);
    expect(nextReceipt.positions[1].claims).toEqual([]);
    expect(nextReceipt.positions[1].id).not.toBe("pos-1");
  });

  it("warns only for claims on rows that are actually removed", () => {
    const currentReceipt: Receipt = {
      meta: { title: "Receipt", currencySymbol: "₽" },
      positions: [
        {
          id: "pos-1",
          name: "Burger",
          price: 100,
          quantity: 1,
          overall: 100,
          claims: [],
        },
        {
          id: "pos-2",
          name: "Soda",
          price: 50,
          quantity: 1,
          overall: 50,
          claims: [
            {
              id: "claim-2",
              participantIds: ["participant-1"],
              type: "quantity",
              value: 1,
            },
          ],
        },
      ],
      fees: [],
      discounts: [],
      totals: { total: 150, grandTotal: 150 },
    };

    const warnings = buildStructuralLossWarnings(
      currentReceipt,
      {
        meta: { title: "Receipt", currencySymbol: "₽" },
        positions: [
          {
            id: "pos-1",
            name: "Burger",
            price: 110,
            quantity: 1,
            overall: 110,
          },
          {
            name: "Fries",
            price: 60,
            quantity: 1,
            overall: 60,
          },
        ],
        fees: [],
        discounts: [],
        totals: { total: 170, grandTotal: 170 },
      },
      participants,
      "₽",
      (value) => `${value} ₽`,
    );

    expect(warnings).toEqual([
      {
        id: "pos-2-claim-2-0",
        text: `Ivan — Soda 1 ${t("pcs")}`,
      },
    ]);
  });
});
