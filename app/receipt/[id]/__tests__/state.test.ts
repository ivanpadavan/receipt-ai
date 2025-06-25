import { ReceiptState, receiptFormState$ } from "../receipt-state";
import { Receipt } from "@/model/receipt/model";
import { describe, expect, it } from "vitest";

describe("Receipt Form State Management", () => {
  // Sample receipt data for testing
  const validReceipt: Receipt = {
    positions: [
      {
        name: "Item 1",
        quantity: 2,
        price: 10,
        overall: 20
      }
    ],
    total: {
      totals: {
        total: 20,
        grandTotal: 23
      },
      fees: [
        {
          name: "Tax",
          value: 5
        }
      ],
      discounts: [
        {
          name: "Discount",
          value: 2
        }
      ]
    }
  };

  const invalidReceipt: Receipt = {
    positions: [
      {
        name: "Item 1",
        quantity: 2,
        price: 10,
        overall: 25 // Incorrect overall value
      }
    ],
    total: {
      totals: {
        total: 25, // Incorrect total
        grandTotal: 30 // Incorrect grand total
      },
      fees: [
        {
          name: "Tax",
          value: 5
        }
      ],
      discounts: [
        {
          name: "Discount",
          value: 2
        }
      ]
    }
  };

  it("should create a valid form state for a valid receipt", () => {
    const state$ = receiptFormState$(validReceipt);

    state$.subscribe((state: ReceiptState) => {
      expect(state.scenario.type).toBe('editing');
      expect(state.scenario.form).toBeDefined();

      // Check form structure
      const form = state.scenario.form;
      expect(form.controls.positions).toBeDefined();
      expect(form.controls.total).toBeDefined();
      expect(form.controls.total.controls.totals).toBeDefined();
      expect(form.controls.total.controls.totals.controls.total).toBeDefined();
      expect(form.controls.total.controls.totals.controls.grandTotal).toBeDefined();
      expect(form.controls.total.controls.fees).toBeDefined();
      expect(form.controls.total.controls.discounts).toBeDefined();

      // Check form values
      expect(form.controls.positions.controls[0].controls.name.value).toBe('Item 1');
      expect(form.controls.positions.controls[0].controls.quantity.value).toBe(2);
      expect(form.controls.positions.controls[0].controls.price.value).toBe(10);
      expect(form.controls.positions.controls[0].controls.overall.value).toBe(20);
      expect(form.controls.total.controls.totals.controls.total.value).toBe(20);
      expect(form.controls.total.controls.totals.controls.grandTotal.value).toBe(23);

      // Check form validity
      expect(form.valid).toBe(true);
    });
  });

  it("should create a validation form state for an invalid receipt", () => {
    const state$ = receiptFormState$(invalidReceipt);

    state$.subscribe((state: ReceiptState) => {
      expect(state.scenario.type).toBe('validation');
      expect(state.scenario.form).toBeDefined();

      // Check form structure
      const form = state.scenario.form;
      expect(form.controls.positions).toBeDefined();
      expect(form.controls.total).toBeDefined();
      expect(form.controls.total.controls.totals).toBeDefined();
      expect(form.controls.total.controls.totals.controls.total).toBeDefined();
      expect(form.controls.total.controls.totals.controls.grandTotal).toBeDefined();
      expect(form.controls.total.controls.fees).toBeDefined();
      expect(form.controls.total.controls.discounts).toBeDefined();

      // Check form values
      expect(form.controls.positions.controls[0].controls.name.value).toBe('Item 1');
      expect(form.controls.positions.controls[0].controls.quantity.value).toBe(2);
      expect(form.controls.positions.controls[0].controls.price.value).toBe(10);
      expect(form.controls.positions.controls[0].controls.overall.value).toBe(25);
      expect(form.controls.total.controls.totals.controls.total.value).toBe(25);
      expect(form.controls.total.controls.totals.controls.grandTotal.value).toBe(30);

      // Check form validity
      expect(form.valid).toBe(false);

      // Check specific validation errors
      const positionOverall = form.controls.positions.controls[0].controls.overall;
      expect(positionOverall.errors).toBeDefined();
      expect(positionOverall.errors).toMatchInlineSnapshot(`
        {
          "overallMismatch": "Overall value 25 doesn't match quantity * price (2 * 10 = 20)",
        }
      `);

      const total = form.controls.total.controls.totals.controls.total;
      expect(total.errors).toBeDefined();
      expect(total.errors).toMatchInlineSnapshot(`null`);
    });
  });

  it("should update calculated values when form values change", () => {
    const state$ = receiptFormState$(validReceipt);

    state$.subscribe((state: ReceiptState) => {
      const form = state.scenario.form;

      // Change quantity and check if overall is updated
      const positionGroup = form.controls.positions.controls[0];
      positionGroup.controls.quantity.setValue(3);

      // Check if overall is updated
      expect(positionGroup.controls.overall.value).toBe(30);

      // Check if positionsTotal is updated
      expect(form.controls.total.controls.totals.controls.total.value).toBe(30);

      // Check if total is updated
      expect(form.controls.total.controls.totals.controls.grandTotal.value).toBe(33);
    });
  });
});
