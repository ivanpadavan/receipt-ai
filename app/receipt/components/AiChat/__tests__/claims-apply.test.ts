import { describe, expect, it } from "vitest";
import { t } from "@/app/i18n/translations";
import {
  applyClaimsPreviewAdd,
  applyClaimsPreviewReplace,
  buildClaimsReplaceWarnings,
  buildClaimsPreviewRemovedPositions,
  canReplaceClaimsPreview,
  getClaimsPreviewStatus,
  isClaimsPreviewApplied,
} from "@/app/receipt/components/AiChat/claims-apply";
import { buildClaimsPreviewReceipt } from "@/model/receipt/claims-preview";
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

  it("preserves snapshot claims on positions omitted from positionClaims", () => {
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
        {
          id: "pos-2",
          name: "Soda",
          price: 50,
          quantity: 1,
          overall: 50,
          claims: [
            {
              id: "claim-2",
              participantIds: ["participant-2"],
              type: "amount",
              value: 50,
            },
          ],
        },
      ],
      fees: [],
      discounts: [],
      totals: { total: 150, grandTotal: 150 },
    };

    const previewReceipt = buildClaimsPreviewReceipt(receipt, {
      "pos-1": [
        {
          participantIds: ["participant-1"],
          type: "amount",
          value: 80,
        },
      ],
    });

    expect(previewReceipt.positions[0].claims).toHaveLength(1);
    expect(previewReceipt.positions[0].claims[0]).toMatchObject({
      participantIds: ["participant-1"],
      type: "amount",
      value: 80,
    });
    expect(previewReceipt.positions[1].claims).toEqual(receipt.positions[1].claims);
  });

  it("computes replace availability, warnings, and preview states", () => {
    const snapshotReceipt: Receipt = {
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
    const warningReceipt: Receipt = {
      ...snapshotReceipt,
      positions: [
        {
          ...snapshotReceipt.positions[0],
          claims: [
            {
              id: "live-claim-1",
              participantIds: ["participant-1"],
              type: "amount",
              value: 80,
            },
            {
              id: "live-claim-2",
              participantIds: ["participant-1"],
              type: "quantity",
              value: 1,
            },
          ],
        },
      ],
    };
    const appliedReceipt: Receipt = {
      ...snapshotReceipt,
      positions: [
        {
          ...snapshotReceipt.positions[0],
          claims: [
            {
              id: "live-claim-1",
              participantIds: ["participant-1"],
              type: "amount",
              value: 80,
            },
          ],
        },
      ],
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

    expect(canReplaceClaimsPreview(warningReceipt, positionClaims)).toBe(true);
    expect(
      buildClaimsReplaceWarnings(
        warningReceipt,
        positionClaims,
        participants,
        "₽",
        (value) => `${value} ₽`,
      ),
    ).toEqual([
      {
        id: "pos-1-live-claim-2-1",
        text: `Ivan — Burger 1 ${t("pcs")}`,
      },
    ]);
    expect(isClaimsPreviewApplied(appliedReceipt, snapshotReceipt, positionClaims)).toBe(true);
    expect(getClaimsPreviewStatus(appliedReceipt, snapshotReceipt, positionClaims)).toBe("applied");
    expect(buildClaimsPreviewRemovedPositions(appliedReceipt, snapshotReceipt)).toHaveLength(0);

    const changedLiveReceipt: Receipt = {
      ...snapshotReceipt,
      positions: [
        {
          ...snapshotReceipt.positions[0],
          name: "Burger XL",
        },
      ],
    };

    expect(buildClaimsPreviewRemovedPositions(changedLiveReceipt, snapshotReceipt)).toHaveLength(0);
    expect(getClaimsPreviewStatus(changedLiveReceipt, snapshotReceipt, positionClaims)).toBe(
      "pending",
    );

    const expiredLiveReceipt: Receipt = {
      ...snapshotReceipt,
      positions: [],
      totals: { total: 0, grandTotal: 0 },
    };

    expect(buildClaimsPreviewRemovedPositions(expiredLiveReceipt, snapshotReceipt)).toHaveLength(1);
    expect(getClaimsPreviewStatus(expiredLiveReceipt, snapshotReceipt, positionClaims)).toBe("expired");
  });
});
