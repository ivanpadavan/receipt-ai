import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EditingSheet } from "../EditingSheet";
import { ReceiptPosition, ReceiptModifier, Receipt } from "@/model/receipt/model";

// Mock useReceiptState
const mockReceiptState = {
    scenario: {
        type: "validation" as "validation" | "editing" | "splitting",
        canEdit: { positionForm: true, modifierForm: true, totalsForm: true },
        form: {} as any,
    },
    openEditModal: vi.fn(),
    proceed: vi.fn(),
    canProceed$: { subscribe: vi.fn() },
    openEditModalCommand$: { subscribe: vi.fn() },
};

vi.mock("../../ReceiptForm", () => ({
    useReceiptState: () => mockReceiptState,
}));

// Mock translations
vi.mock("@/app/i18n/translations", () => ({
    t: (key: string) => {
        const translations: Record<string, string> = {
            editPosition: "Edit Position",
            editFee: "Edit Fee",
            editDiscount: "Edit Discount",
            overall: "Overall",
            name: "Name",
            price: "Price",
            quantity: "Quantity",
            modifierName: "Modifier Name",
            modifierValue: "Modifier Value",
            total: "Total",
            grandTotal: "Grand Total",
            save: "Save",
            cancel: "Cancel",
            remove: "Remove",
        };
        return translations[key] || key;
    },
}));

// Mock Drawer context
vi.mock("@/components/ui/drawer", () => ({
    DrawerContent: ({ children }: { children: React.ReactNode }) => <div data-testid="drawer-content">{children}</div>,
    DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DrawerFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="drawer-footer">{children}</div>,
    DrawerClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useWithinDrawerContext: () => ({ closing: false }),
}));

// Mock toast
vi.mock("sonner", () => ({
    toast: { dismiss: vi.fn() },
}));

describe("EditingSheet", () => {
    const defaultPosition: ReceiptPosition = {
        id: "pos-1",
        name: "Test Position",
        price: 100,
        quantity: 2,
        overall: 200,
        claims: [],
    };

    const defaultModifier: ReceiptModifier = {
        id: "mod-1",
        name: "Test Fee",
        value: 50,
    };

    const defaultTotals: Receipt["totals"] = {
        total: 1000,
        grandTotal: 1050,
    };

    let onSave: ReturnType<typeof vi.fn>;
    let onRemove: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onSave = vi.fn();
        onRemove = vi.fn();
        mockReceiptState.scenario.type = "validation";
    });

    afterEach(() => {
        cleanup();
    });

    describe("Validation Mode", () => {
        beforeEach(() => {
            mockReceiptState.scenario.type = "validation";
        });

        it("renders position name field", () => {
            render(
                <EditingSheet
                    fieldType="position"
                    initialValue={defaultPosition}
                    header="editPosition"
                    onSave={onSave}
                />
            );

            expect(screen.getByDisplayValue("Test Position")).toBeInTheDocument();
        });

        it("shows validation errors for empty name", () => {
            const invalidPosition = { ...defaultPosition, name: "" };

            render(
                <EditingSheet
                    fieldType="position"
                    initialValue={invalidPosition}
                    header="editPosition"
                    onSave={onSave}
                    onRemove={onRemove}
                />
            );

            expect(screen.getByText(/Name should not be empty/i)).toBeInTheDocument();
        });

        it("shows validation errors for invalid price", () => {
            const invalidPosition = { ...defaultPosition, price: 0 };

            render(
                <EditingSheet
                    fieldType="position"
                    initialValue={invalidPosition}
                    header="editPosition"
                    onSave={onSave}
                    onRemove={onRemove}
                />
            );

            expect(screen.getByText(/Price should be greater than 0/i)).toBeInTheDocument();
        });

        it("renders save button", () => {
            render(
                <EditingSheet
                    fieldType="position"
                    initialValue={defaultPosition}
                    header="editPosition"
                    onSave={onSave}
                />
            );

            expect(screen.getByText("Save")).toBeInTheDocument();
        });

        it("renders cancel button", () => {
            render(
                <EditingSheet
                    fieldType="position"
                    initialValue={defaultPosition}
                    header="editPosition"
                    onSave={onSave}
                />
            );

            expect(screen.getByText("Cancel")).toBeInTheDocument();
        });

        it("renders remove button when onRemove provided", () => {
            render(
                <EditingSheet
                    fieldType="position"
                    initialValue={defaultPosition}
                    header="editPosition"
                    onSave={onSave}
                    onRemove={onRemove}
                />
            );

            expect(screen.getByText("Remove")).toBeInTheDocument();
        });
    });

    describe("Editing Mode", () => {
        beforeEach(() => {
            mockReceiptState.scenario.type = "editing";
        });

        it("disables overall field in editing mode", () => {
            render(
                <EditingSheet
                    fieldType="position"
                    initialValue={defaultPosition}
                    header="editPosition"
                    onSave={onSave}
                />
            );

            const container = screen.getByTestId("drawer-content");
            const inputs = Array.from(container.querySelectorAll("input")) as HTMLInputElement[];
            const disabledInputs = inputs.filter(i => i.disabled);
            expect(disabledInputs.length).toBe(1);
        });
    });

    describe("Modifier Editing", () => {
        it("renders modifier name field", () => {
            render(
                <EditingSheet
                    fieldType="modifier"
                    modifierType="fees"
                    initialValue={defaultModifier}
                    header="editFee"
                    onSave={onSave}
                />
            );

            expect(screen.getByDisplayValue("Test Fee")).toBeInTheDocument();
        });

        it("validates modifier value", () => {
            const invalidModifier = { ...defaultModifier, value: 0 };

            render(
                <EditingSheet
                    fieldType="modifier"
                    modifierType="fees"
                    initialValue={invalidModifier}
                    header="editFee"
                    onSave={onSave}
                    onRemove={onRemove}
                />
            );

            expect(screen.getByText(/Value should be greater than 0/i)).toBeInTheDocument();
        });
    });

    describe("Totals Editing", () => {
        it("renders total fields", () => {
            render(
                <EditingSheet
                    fieldType="totals"
                    initialValue={defaultTotals}
                    header="overall"
                    onSave={onSave}
                />
            );

            expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
            expect(screen.getByDisplayValue("1050")).toBeInTheDocument();
        });
    });
});
