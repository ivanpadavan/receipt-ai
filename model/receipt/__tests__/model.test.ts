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
        positionsTotal: 35, // 20 + 15
        additions: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        total: 38, // 35 + 5 - 2
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
        positionsTotal: 40, // Matches the sum of overall values (20 + 20)
        additions: [],
        discounts: [],
        total: 40,
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

  // Test case for invalid positions total
  test("should detect invalid positions total", () => {
    const receiptWithInvalidPositionsTotal: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 },
        { name: "Item 2", quantity: 1, price: 15, overall: 15 },
      ],
      total: {
        positionsTotal: 40, // Incorrect (should be 35)
        additions: [],
        discounts: [],
        total: 40,
      },
    };

    const result = validateReceipt(receiptWithInvalidPositionsTotal);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Positions total 40 doesn't match the sum of all position overall values (35)",
    );
  });

  // Test case for invalid final total calculation
  test("should detect invalid final total calculation", () => {
    const receiptWithInvalidTotal: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 },
        { name: "Item 2", quantity: 1, price: 15, overall: 15 },
      ],
      total: {
        positionsTotal: 35, // Correct
        additions: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        total: 40, // Incorrect (should be 38)
      },
    };

    const result = validateReceipt(receiptWithInvalidTotal);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Final total 40 doesn't match positionsTotal + additions - discounts (35 + 5 - 2 = 38)",
    );
  });

  // Test case for invalid direct total calculation
  test("should detect invalid direct total calculation", () => {
    const receiptWithInvalidDirectTotal: Receipt = {
      positions: [
        { name: "Item 1", quantity: 2, price: 10, overall: 20 },
        { name: "Item 2", quantity: 1, price: 15, overall: 15 },
      ],
      total: {
        positionsTotal: 35, // Correct
        additions: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        total: 40, // Incorrect (should be 38)
      },
    };

    const result = validateReceipt(receiptWithInvalidDirectTotal);
    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchInlineSnapshot(`
     [
       "Final total 40 doesn't match positionsTotal + additions - discounts (35 + 5 - 2 = 38)",
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
        positionsTotal: 45, // Incorrect (should be 40)
        additions: [{ name: "Tax", value: 5 }],
        discounts: [{ name: "Discount", value: 2 }],
        total: 50, // Incorrect (should be 43)
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
        positionsTotal: 0,
        additions: [],
        discounts: [],
        total: 0,
      },
    };

    const result = validateReceipt(receiptWithEmptyPositions);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Test case for receipt with only additions
  test("should handle receipt with only additions", () => {
    const receiptWithOnlyAdditions: Receipt = {
      positions: [],
      total: {
        positionsTotal: 0,
        additions: [{ name: "Service Fee", value: 10 }],
        discounts: [],
        total: 10,
      },
    };

    const result = validateReceipt(receiptWithOnlyAdditions);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Test case for receipt with only discounts
  test("should handle receipt with only discounts", () => {
    const receiptWithOnlyDiscounts: Receipt = {
      positions: [],
      total: {
        positionsTotal: 0,
        additions: [],
        discounts: [{ name: "Promo", value: 5 }],
        total: -5,
      },
    };

    const result = validateReceipt(receiptWithOnlyDiscounts);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
