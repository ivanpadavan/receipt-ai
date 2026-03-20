import { describe, expect, it } from "vitest";
import {
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
              name: "Burger",
              price: 100,
              quantity: 1,
              overall: 100,
            },
          ],
          fees: [],
          discounts: [],
          totals: {
            total: 100,
            grandTotal: 100,
          },
        },
      }).success,
    ).toBe(true);

    expect(
      receiptChatResponseSchema.safeParse({
        type: "claims_preview",
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
              claims: [],
            },
          ],
          fees: [],
          discounts: [],
          totals: {
            total: 100,
            grandTotal: 100,
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects malformed claims preview responses", () => {
    expect(
      receiptChatResponseSchema.safeParse({
        type: "claims_preview",
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
          fees: [],
          discounts: [],
          totals: {
            total: 100,
            grandTotal: 100,
          },
        },
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
