import { act, renderHook } from "@testing-library/react";
import { useReceiptFormState } from "../useReceiptFormState";
import { Receipt } from "@/model/receipt/model";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("nuqs", () => ({
  useQueryState: vi.fn(() => [null, vi.fn()]),
}));

vi.mock("@/app/api-client", () => ({
  apiClient: {
    createReceipt: vi.fn(),
    updateReceipt: vi.fn().mockReturnValue(Promise.resolve({})),
    joinReceipt: vi.fn().mockReturnValue(Promise.resolve(undefined)),
  },
}));

describe("useReceiptFormState", () => {
  // Sample receipt data for testing
  const validReceipt: Receipt = {
    receiptMeta: {
      title: "Receipt",
      currencySymbol: "₽",
    },
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
  };

  const invalidReceipt: Receipt = {
    receiptMeta: {
      title: "Receipt",
      currencySymbol: "₽",
    },
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create splitting state for a valid receipt", () => {
    const { result } = renderHook(() => useReceiptFormState(validReceipt));

    expect(result.current.scenario.type).toBe("splitting");
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

  it("keeps overall in cent-safe precision for decimal quantity", async () => {
    const receipt: Receipt = {
      receiptMeta: {
        title: "Receipt",
        currencySymbol: "₽",
      },
      positions: [
        {
          id: "pos-1",
          name: "Item 1",
          quantity: 1,
          price: 1620,
          overall: 1620,
          claims: [],
        },
      ],
      totals: {
        total: 1620,
        grandTotal: 1620,
      },
      fees: [],
      discounts: [],
    };

    const { result } = renderHook(() => useReceiptFormState(receipt));
    const form = result.current.scenario.form;

    await act(async () => {
      form.setValue("positions.0.quantity", 0.55);
      await new Promise((r) => setTimeout(r, 10));
    });

    const values = form.getValues();
    expect(values.positions[0].overall).toBe(891);
    expect(values.totals.total).toBe(891);
    expect(values.totals.grandTotal).toBe(891);
  });

  it("should provide openEditModal function", () => {
    const { result } = renderHook(() => useReceiptFormState(validReceipt));

    expect(typeof result.current.openEditModal).toBe("function");
    expect(typeof result.current.proceed).toBe("function");
  });

  it("should emit modal props when openEditModal is called for position", () => {
    const { result } = renderHook(() => useReceiptFormState(validReceipt));

    expect(result.current.editModalProps.splitting).toBeNull();
    expect(result.current.editModalProps.editing).toBeNull();

    act(() => {
      result.current.openEditModal({ type: "position", index: 0 });
    });
    const emittedProps = result.current.editModalProps.splitting;
    expect(emittedProps).not.toBeNull();
    expect((emittedProps as { fieldType: string }).fieldType).toBe("position");
    expect(
      (emittedProps as { initialValue: { name: string } }).initialValue.name,
    ).toBe("Item 1");
    expect(typeof (emittedProps as { onSave: () => void }).onSave).toBe(
      "function",
    );
    expect(typeof (emittedProps as { onRemove: () => void }).onRemove).toBe(
      "function",
    );
    expect(typeof (emittedProps as { close: () => void }).close).toBe(
      "function",
    );
  });

  it("should emit modal props for addPosition", () => {
    const { result } = renderHook(() => useReceiptFormState(validReceipt));
    expect(result.current.editModalProps.splitting).toBeNull();
    expect(result.current.editModalProps.editing).toBeNull();

    act(() => {
      result.current.openEditModal("addPosition");
    });
    const props = result.current.editModalProps.editing as {
      initialValue: { id?: string; name: string };
      fieldType: string;
      header: string;
      view: string;
      onSave: () => void;
    };
    delete props.initialValue.id;
    expect(props.fieldType).toBe("position");
    expect(props.header).toBe("addPosition");
    expect(props.view).toBe("editing");
    expect(typeof props.onSave).toBe("function");
    expect(props.initialValue).toMatchObject({
      name: "",
      quantity: 0,
      price: 0,
      overall: 0,
      claims: [],
    });
  });

  it("recalculates totals when editing a position via modal save", () => {
    const { result } = renderHook(() => useReceiptFormState(validReceipt));

    act(() => {
      result.current.openEditModal({ type: "position", index: 0 });
    });

    const props = result.current.editModalProps.splitting as {
      onSave: (data: Receipt["positions"][number]) => void;
    };

    act(() => {
      props.onSave({
        ...validReceipt.positions[0],
        quantity: 3,
        overall: 30,
      });
    });

    const values = result.current.scenario.form.getValues();
    expect(values.totals.total).toBe(30);
    expect(values.totals.grandTotal).toBe(33);
  });

  it("keeps splitting mode when position becomes over-claimed after edit", async () => {
    const receiptWithFullClaims: Receipt = {
      ...validReceipt,
      positions: [
        {
          ...validReceipt.positions[0],
          claims: [
            {
              id: "claim-1",
              participantIds: ["p-1"],
              type: "quantity",
              value: 2,
            },
          ],
        },
      ],
    };

    const { result } = renderHook(() =>
      useReceiptFormState(receiptWithFullClaims),
    );

    expect(result.current.scenario.type).toBe("splitting");

    act(() => {
      result.current.openEditModal({ type: "position", index: 0 });
    });

    const props = result.current.editModalProps.splitting as {
      onSave: (data: Receipt["positions"][number]) => void;
    };

    await act(async () => {
      props.onSave({
        ...receiptWithFullClaims.positions[0],
        quantity: 1,
        overall: 10,
      });
    });

    const values = result.current.scenario.form.getValues();
    expect(values.positions[0].quantity).toBe(1);
    expect(values.positions[0].claims[0].value).toBe(2);
    expect(result.current.scenario.type).toBe("splitting");
  });

  it("keeps splitting mode when position is over-claimed after edit", async () => {
    const receiptWithFullClaims: Receipt = {
      ...validReceipt,
      positions: [
        {
          ...validReceipt.positions[0],
          claims: [
            {
              id: "claim-1",
              participantIds: ["p-1"],
              type: "quantity",
              value: 4,
            },
          ],
        },
      ],
    };

    const { result } = renderHook(() =>
      useReceiptFormState(receiptWithFullClaims),
    );

    expect(result.current.scenario.type).toBe("splitting");
  });

  it("does not recalculate totals in validation mode when editing a position", () => {
    const { result } = renderHook(() => useReceiptFormState(invalidReceipt));

    act(() => {
      result.current.openEditModal({ type: "position", index: 0 });
    });

    const props = result.current.editModalProps.editing as {
      onSave: (data: Receipt["positions"][number]) => void;
    };

    act(() => {
      props.onSave({
        ...invalidReceipt.positions[0],
        quantity: 3,
        overall: 30,
      });
    });

    const values = result.current.scenario.form.getValues();
    expect(values.positions[0].overall).toBe(30);
    expect(values.totals.total).toBe(25);
    expect(values.totals.grandTotal).toBe(30);
  });

  it("should emit modal props for addFee", () => {
    const { result } = renderHook(() => useReceiptFormState(validReceipt));

    act(() => {
      result.current.openEditModal("addFee");
    });
    const props = result.current.editModalProps.editing;
    expect(props).not.toBeNull();
    expect(props?.fieldType).toBe("modifier");
    expect(props?.modifierType).toBe("fees");
    expect(props?.header).toBe("addFee");
    expect(props?.initialValue).toBeDefined();

    // Simulate save
    const newFee = { id: "new-fee", name: "Service", value: 10 };
    act(() => {
      props?.onSave(newFee);
    });

    // Check if fee was added
    const values = result.current.scenario.form.getValues();
    expect(values.fees[0].name).toBe("Service"); // Prepend used
    expect(values.fees[1].name).toBe("Tax");

    // Check totals updated
    // Original GT: 23. Added Fee 10. Discount unchanged. Positions unchanged.
    // 20 + (5 + 10) - 2 = 33.
    expect(values.totals.grandTotal).toBe(33);
  });

  it("recalculates grandTotal when adding discount in splitting mode", () => {
    const { result } = renderHook(() => useReceiptFormState(validReceipt));

    act(() => {
      result.current.openEditModal("addDiscount");
    });

    const props = result.current.editModalProps.editing;
    expect(props).not.toBeNull();
    expect(props?.fieldType).toBe("modifier");
    expect(props?.modifierType).toBe("discounts");

    act(() => {
      props?.onSave({ id: "new-discount", name: "Promo", value: 4 });
    });

    const values = result.current.scenario.form.getValues();
    expect(values.discounts[0].name).toBe("Promo");
    expect(values.totals.grandTotal).toBe(19);
  });

  it("does not recalculate totals when adding discount in validation mode", () => {
    const { result } = renderHook(() => useReceiptFormState(invalidReceipt));

    act(() => {
      result.current.openEditModal("addDiscount");
    });

    const props = result.current.editModalProps.editing;
    expect(props).not.toBeNull();
    expect(props?.fieldType).toBe("modifier");
    expect(props?.modifierType).toBe("discounts");

    act(() => {
      props?.onSave({ id: "new-discount", name: "Promo", value: 4 });
    });

    const values = result.current.scenario.form.getValues();
    expect(values.discounts[0].name).toBe("Promo");
    expect(values.totals.total).toBe(25);
    expect(values.totals.grandTotal).toBe(30);
  });

  it("should have correct permissions for different modes", () => {
    // Editing mode
    const { result: editResult } = renderHook(() =>
      useReceiptFormState(validReceipt),
    );
    expect(editResult.current.scenario.canEdit.positionForm).toBe(true);
    expect(editResult.current.scenario.canEdit.modifierForm).toBe(true);
    expect(editResult.current.scenario.canEdit.totalsForm).toBe(false);

    // Validation mode
    const { result: validationResult } = renderHook(() =>
      useReceiptFormState(invalidReceipt),
    );
    expect(validationResult.current.scenario.canEdit.positionForm).toBe(true);
    expect(validationResult.current.scenario.canEdit.modifierForm).toBe(true);
    expect(validationResult.current.scenario.canEdit.totalsForm).toBe(true);
  });
});
