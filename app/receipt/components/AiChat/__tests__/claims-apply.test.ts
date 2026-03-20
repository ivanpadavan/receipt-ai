import { describe, expect, it } from "vitest";
import { t } from "@/app/i18n/translations";
import {
  applyClaimsPreviewAdd,
  applyClaimsPreviewReplace,
  buildClaimsReplaceWarnings,
  canReplaceClaimsPreview,
  isClaimsPreviewExpired,
} from "@/app/receipt/components/AiChat/claims-apply";
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
  {
    id: "participant-2",
    displayName: "Anna",
    color: "#222222",
    kind: "REAL" as const,
    isAnonymous: false,
    isOnline: true,
  },
];

describe("claims-apply", () => {
  it("adds only new claims in add mode", () => {
    const receipt: Receipt = {
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

    const nextReceipt = applyClaimsPreviewAdd(receipt, {
      "pos-1": [
        {
          id: "ai-claim-1",
          participantIds: ["participant-1"],
          type: "quantity",
          value: 1,
        },
        {
          id: "ai-claim-2",
          participantIds: ["participant-2"],
          type: "amount",
          value: 50,
        },
      ],
    });

    expect(nextReceipt.positions[0].claims).toHaveLength(2);
    expect(
      nextReceipt.positions[0].claims.some((claim) => claim.participantIds[0] === "participant-2"),
    ).toBe(true);
  });

  it("replaces only affected participants and keeps unrelated claims", () => {
    const receipt: Receipt = {
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
            {
              id: "claim-2",
              participantIds: ["participant-2"],
              type: "amount",
              value: 30,
            },
          ],
        },
      ],
      fees: [],
      discounts: [],
      totals: { total: 100, grandTotal: 100 },
    };

    const nextReceipt = applyClaimsPreviewReplace(receipt, {
      "pos-1": [
        {
          id: "ai-claim-1",
          participantIds: ["participant-1"],
          type: "amount",
          value: 60,
        },
      ],
    });

    expect(nextReceipt.positions[0].claims).toHaveLength(2);
    expect(
      nextReceipt.positions[0].claims.some((claim) => claim.participantIds[0] === "participant-2"),
    ).toBe(true);
    expect(
      nextReceipt.positions[0].claims.some(
        (claim) => claim.participantIds[0] === "participant-1" && claim.value === 60,
      ),
    ).toBe(true);
  });

  it("computes replace availability, warnings, and expiration", () => {
    const receipt: Receipt = {
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
    const positionClaims = {
      "pos-1": [
        {
          id: "ai-claim-1",
          participantIds: ["participant-1"],
          type: "amount" as const,
          value: 80,
        },
      ],
    };

    expect(canReplaceClaimsPreview(receipt, positionClaims)).toBe(true);
    expect(
      buildClaimsReplaceWarnings(
        receipt,
        positionClaims,
        participants,
        "₽",
        (value) => `${value} ₽`,
      ),
    ).toEqual([
      {
        id: "pos-1-claim-1-0",
        text: `Ivan — Burger 1 ${t("pcs")}`,
      },
    ]);
    expect(isClaimsPreviewExpired(receipt, { "missing-pos": positionClaims["pos-1"] })).toBe(true);
  });
});
