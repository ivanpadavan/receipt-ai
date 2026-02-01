import { renderHook, act } from "@testing-library/react";
import { useReceiptFormState, ReceiptState } from "../useReceiptFormState";
import { Receipt } from "@/model/receipt/model";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/app/api-client", () => ({
    apiClient: {
        createReceipt: vi.fn(),
        updateReceipt: vi.fn().mockReturnValue(Promise.resolve({})),
    },
}));

describe("useReceiptFormState", () => {
    // Sample receipt data for testing
    const validReceipt: Receipt = {
        positions: [
            {
                id: "pos-1",
                name: "Item 1",
                quantity: 2,
                price: 10,
                overall: 20,
                claims: [],
            },
        ],
        totals: {
            total: 20,
            grandTotal: 23,
        },
        fees: [
            {
                id: "fee-1",
                name: "Tax",
                value: 5,
            },
        ],
        discounts: [
            {
                id: "disc-1",
                name: "Discount",
                value: 2,
            },
        ],
        participants: [],
    };

    const invalidReceipt: Receipt = {
        positions: [
            {
                id: "pos-1",
                name: "Item 1",
                quantity: 2,
                price: 10,
                overall: 25, // Incorrect overall value
                claims: [],
            },
        ],
        totals: {
            total: 25, // Incorrect total
            grandTotal: 30, // Incorrect grand total
        },
        fees: [
            {
                id: "fee-1",
                name: "Tax",
                value: 5,
            },
        ],
        discounts: [
            {
                id: "disc-1",
                name: "Discount",
                value: 2,
            },
        ],
        participants: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create editing state for a valid receipt", () => {
        const { result } = renderHook(() => useReceiptFormState(validReceipt));

        expect(result.current.scenario.type).toBe("editing");
        expect(result.current.scenario.form).toBeDefined();

        // Check form values via getValues
        const values = result.current.scenario.form.getValues();
        expect(values.positions[0].name).toBe("Item 1");
        expect(values.positions[0].quantity).toBe(2);
        expect(values.positions[0].price).toBe(10);
        expect(values.positions[0].overall).toBe(20);
        expect(values.totals.total).toBe(20);
        expect(values.totals.grandTotal).toBe(23);
    });

    it("should create validation state for an invalid receipt", () => {
        const { result } = renderHook(() => useReceiptFormState(invalidReceipt));

        expect(result.current.scenario.type).toBe("validation");
        expect(result.current.scenario.form).toBeDefined();

        // Check form values
        const values = result.current.scenario.form.getValues();
        expect(values.positions[0].overall).toBe(25);
        expect(values.totals.total).toBe(25);
        expect(values.totals.grandTotal).toBe(30);
    });

    it("should update calculated values when form values change", async () => {
        const { result } = renderHook(() => useReceiptFormState(validReceipt));

        const form = result.current.scenario.form;

        // Change quantity
        await act(async () => {
            form.setValue("positions.0.quantity", 3);
            // Trigger validation to run the auto-calculation effect
            await new Promise((r) => setTimeout(r, 10));
        });

        // In editing mode, overall should be auto-calculated
        const values = form.getValues();
        expect(values.positions[0].overall).toBe(30);
        expect(values.totals.total).toBe(30);
        expect(values.totals.grandTotal).toBe(33);
    });

    it("should provide openEditModal function", () => {
        const { result } = renderHook(() => useReceiptFormState(validReceipt));

        expect(typeof result.current.openEditModal).toBe("function");
        expect(typeof result.current.proceed).toBe("function");
    });

    it("should emit modal props when openEditModal is called for position", () => {
        const { result } = renderHook(() => useReceiptFormState(validReceipt));

        let emittedProps: unknown = null;
        const subscription = result.current.openEditModalCommand$.subscribe(
            (props) => {
                emittedProps = props;
            }
        );

        act(() => {
            result.current.openEditModal({ type: "position", index: 0 });
        });

        expect(emittedProps).not.toBeNull();
        expect((emittedProps as { fieldType: string }).fieldType).toBe("position");
        expect((emittedProps as { initialValue: { name: string } }).initialValue.name).toBe("Item 1");
        expect(typeof (emittedProps as { onSave: () => void }).onSave).toBe("function");
        expect(typeof (emittedProps as { onRemove: () => void }).onRemove).toBe("function");

        subscription.unsubscribe();
    });

    it("should emit modal props for addPosition", () => {
        const { result } = renderHook(() => useReceiptFormState(validReceipt));

        let emittedProps: unknown = null;
        const subscription = result.current.openEditModalCommand$.subscribe(
            (props) => {
                emittedProps = props;
            }
        );

        act(() => {
            result.current.openEditModal("addPosition");
        });
        delete emittedProps.initialValue.id;
        expect(emittedProps).toMatchInlineSnapshot(`
          {
            "fieldType": "position",
            "header": "addPosition",
            "initialValue": {
              "claims": [],
              "name": "",
              "overall": 0,
              "price": 0,
              "quantity": 0,
            },
            "onSave": [Function],
          }
        `);

        subscription.unsubscribe();
    });

    it("should have correct permissions for different modes", () => {
        // Editing mode
        const { result: editResult } = renderHook(() =>
            useReceiptFormState(validReceipt)
        );
        expect(editResult.current.scenario.canEdit.positionForm).toBe(true);
        expect(editResult.current.scenario.canEdit.modifierForm).toBe(true);
        expect(editResult.current.scenario.canEdit.totalsForm).toBe(false);

        // Validation mode
        const { result: validationResult } = renderHook(() =>
            useReceiptFormState(invalidReceipt)
        );
        expect(validationResult.current.scenario.canEdit.positionForm).toBe(true);
        expect(validationResult.current.scenario.canEdit.modifierForm).toBe(true);
        expect(validationResult.current.scenario.canEdit.totalsForm).toBe(true);
    });
});
