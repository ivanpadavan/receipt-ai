import { describe, expect, it } from "vitest";
import {
  receiptAiSchema,
  receiptBusinessSchema,
  receiptSchema,
} from "@/model/receipt/schema";

describe("receipt schemas", () => {
  it("accepts structurally valid but mathematically invalid receipts for AI parsing", () => {
    const receipt = {
      positions: [
        {
          name: "Beer",
          price: 969,
          quantity: 0.5,
          overall: 500,
        },
      ],
      fees: [],
      discounts: [],
      totals: {
        total: 500,
        grandTotal: 500,
      },
    };

    expect(receiptAiSchema.safeParse(receipt).success).toBe(true);
    expect(receiptBusinessSchema.safeParse(receipt).success).toBe(false);
  });

  it("uses business validation inside app receipt schema", () => {
    const receipt = {
      positions: [
        {
          id: "pos-1",
          name: "Beer",
          price: 969,
          quantity: 0.5,
          overall: 500,
          claims: [],
        },
      ],
      fees: [],
      discounts: [],
      totals: {
        total: 500,
        grandTotal: 500,
      },
    };

    expect(receiptSchema.safeParse(receipt).success).toBe(false);
  });
});
