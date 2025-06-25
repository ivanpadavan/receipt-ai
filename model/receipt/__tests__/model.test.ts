import { validateReceipt, Receipt } from "../model";

describe("validateReceipt", () => {
  // Test case for valid receipt data
  test("should return isValid=true for valid receipt data", () => {
    // Create a valid receipt with correct calculations
    const validReceipt: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 },
        { name: "Item 2", quantity: 1, price: 15, overall: 15 },
      ],
      total: {
        total: 35, // 20 + 15
        fees: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        grandTotal: 38, // 35 + 5 - 2
      },
    };

    const result = validateReceipt(validReceipt);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Test case for invalid position calculation
  test("should detect invalid position calculation", () => {
    const receiptWithInvalidPosition: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 }, // Correct
        { name: "Item 2", quantity: 1, price: 15, overall: 20 }, // Incorrect (should be 15)
      ],
      total: {
        total: 40, // Matches the sum of overall values (20 + 20)
        fees: [],
        discounts: [],
        grandTotal: 40,
      },
    };

    const result = validateReceipt(receiptWithInvalidPosition);
    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchInlineSnapshot(`
     [
       "Position Item 2: overall value 20 doesn't match quantity * price (1 * 15 = 15) at index 1",
     ]
    `);
  });

  // Test case for invalid total
  test("should detect invalid total", () => {
    const receiptWithInvalidTotal: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 },
        { name: "Item 2", quantity: 1, price: 15, overall: 15 },
      ],
      total: {
        total: 40, // Incorrect (should be 35)
        fees: [],
        discounts: [],
        grandTotal: 40,
      },
    };

    const result = validateReceipt(receiptWithInvalidTotal);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Total 40 doesn't match the sum of all position overall values (35)",
    );
  });

  // Test case for invalid final grand total calculation
  test("should detect invalid final grand total calculation", () => {
    const receiptWithInvalidGrandTotal: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 },
        { name: "Item 2", quantity: 1, price: 15, overall: 15 },
      ],
      total: {
        total: 35, // Correct
        fees: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        grandTotal: 40, // Incorrect (should be 38)
      },
    };

    const result = validateReceipt(receiptWithInvalidGrandTotal);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Final grand total 40 doesn't match total + fees - discounts (35 + 5 - 2 = 38)",
    );
  });

  // Test case for invalid direct grand total calculation
  test("should detect invalid direct grand total calculation", () => {
    const receiptWithInvalidDirectGrandTotal: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 },
        { name: "Item 2", quantity: 1, price: 15, overall: 15 },
      ],
      total: {
        total: 35, // Correct
        fees: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        grandTotal: 40, // Incorrect (should be 38)
      },
    };

    const result = validateReceipt(receiptWithInvalidDirectGrandTotal);
    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchInlineSnapshot(`
     [
       "Final grand total 40 doesn't match total + fees - discounts (35 + 5 - 2 = 38)",
     ]
    `);
  });

  // Test case for multiple errors
  test("should detect multiple errors", () => {
    const receiptWithMultipleErrors: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 25 }, // Incorrect (should be 20)
        { name: "Item 2", quantity: 1, price: 15, overall: 15 }, // Correct
      ],
      total: {
        total: 45, // Incorrect (should be 40)
        fees: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        grandTotal: 50, // Incorrect (should be 48)
      },
    };

    const result = validateReceipt(receiptWithMultipleErrors);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  // Test case for empty positions
  test("should handle receipt with empty positions", () => {
    const receiptWithEmptyPositions: Receipt = {
      positions: [],
      total: {
        total: 0,
        fees: [],
        discounts: [],
        grandTotal: 0,
      },
    };

    const result = validateReceipt(receiptWithEmptyPositions);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Test case for receipt with only fees
  test("should handle receipt with only fees", () => {
    const receiptWithOnlyfees: Receipt = {
      positions: [],
      total: {
        total: 0,
        fees: [{ name: "Service Fee", value: 10 }],
        discounts: [],
        grandTotal: 10,
      },
    };

    const result = validateReceipt(receiptWithOnlyfees);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Test case for receipt with only discounts
  test("should handle receipt with only discounts", () => {
    const receiptWithOnlyDiscounts: Receipt = {
      positions: [],
      total: {
        total: 0,
        fees: [],
        discounts: [{ name: "Promo", value: 5 }],
        grandTotal: -5,
      },
    };

    const result = validateReceipt(receiptWithOnlyDiscounts);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
