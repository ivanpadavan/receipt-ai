import { describe, expect, it } from "vitest";
import {
  receiptChatClaimsPreviewModelResponseSchema,
  receiptChatRequestSchema,
  receiptChatResponseSchema,
} from "@/model/receipt/schema-chat";

describe("receipt chat schemas", () => {
  it("parses question, structural preview, and claims preview responses", () => {
    expect(
      receiptChatResponseSchema.safeParse({
        type: "question",
        message: "What should I change?",
      }).success,
    ).toBe(true);

    expect(
      receiptChatResponseSchema.safeParse({
        type: "structural_preview",
        receipt: {
          meta: {
            title: "Lunch",
            currencySymbol: "₽",
          },
          positions: [
            {
              id: "position-1",
              name: "Burger",
              price: 100,
              quantity: 1,
              overall: 100,
            },
          ],
          fees: [
            {
              id: "fee-1",
              name: "Service",
              value: 10,
            },
          ],
          discounts: [
            {
              id: "discount-1",
              name: "Promo",
              value: 5,
            },
          ],
          totals: {
            total: 100,
            grandTotal: 100,
          },
        },
      }).success,
    ).toBe(true);

    expect(
      receiptChatClaimsPreviewModelResponseSchema.safeParse({
        type: "claims_preview",
        positions: [
          {
            id: "position-1",
            name: "Burger",
            price: 100,
            quantity: 1,
            overall: 100,
            claims: [
              {
                participantIds: ["participant-1"],
                type: "quantity",
                value: 1,
              },
            ],
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      receiptChatResponseSchema.safeParse({
        type: "claims_preview",
        receiptSnapshot: {
          meta: {
            title: "Lunch",
            currencySymbol: "₽",
          },
          positions: [
            {
              id: "position-1",
              name: "Burger",
              price: 100,
              quantity: 1,
              overall: 100,
              claims: [],
            },
          ],
          fees: [
            {
              id: "fee-1",
              name: "Service",
              value: 10,
            },
          ],
          discounts: [
            {
              id: "discount-1",
              name: "Promo",
              value: 5,
            },
          ],
          totals: {
            total: 100,
            grandTotal: 100,
          },
        },
        positionClaims: {
          "position-1": [
            {
              participantIds: ["participant-1"],
              type: "quantity",
              value: 1,
            },
          ],
        },
        events: [],
      }).success,
    ).toBe(true);
  });

  it("rejects malformed claims preview responses", () => {
    expect(
      receiptChatClaimsPreviewModelResponseSchema.safeParse({
        type: "claims_preview",
        positions: [
          {
            name: "Burger",
            price: 100,
            quantity: 1,
            overall: 100,
            claims: [],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("parses chat requests", () => {
    expect(
      receiptChatRequestSchema.safeParse({
        message: "Change burger quantity to 2",
      }).success,
    ).toBe(true);
  });
});
