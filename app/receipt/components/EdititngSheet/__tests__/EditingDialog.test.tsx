import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EditingDialog } from "../EditingDialog";
import { ReceiptPosition } from "@/model/receipt/model";
import type { ComponentProps, ReactNode } from "react";

const mockUseRowConflict = vi.fn();
const mockSetValue = vi.fn();

vi.mock("../useRowConflict", () => ({
  useRowConflict: (...args: unknown[]) => mockUseRowConflict(...args),
}));

vi.mock("../../ReceiptForm", () => ({
  useReceiptState: () => ({
    scenario: {
      form: {
        setValue: mockSetValue,
      },
    },
  }),
}));

vi.mock("@/app/i18n/translations", () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      editPosition: "Edit position",
      name: "Name",
      price: "Price",
      save: "Save",
      remove: "Remove",
    };
    return translations[key] || key;
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

const basePosition: ReceiptPosition = {
  id: "pos-1",
  name: "Latte",
  price: 0,
  quantity: 1,
  overall: 0,
  claims: [],
};

const validValidator = {
  safeParse: () => ({ success: true }),
};

const invalidValidator = {
  safeParse: () => ({
    success: false,
    error: {
      issues: [{ path: ["name"], message: "Required" }],
    },
  }),
};

const buildProps = (overrides?: Partial<ComponentProps<typeof EditingDialog>>) => ({
  view: "editing" as const,
  fields: [
    { key: "name", label: "name", type: "string" as const },
    { key: "price", label: "price", type: "number" as const },
  ],
  validator: validValidator,
  fieldType: "position" as const,
  initialValue: basePosition,
  header: "editPosition",
  onSave: vi.fn(),
  onRequestClose: vi.fn(),
  ...overrides,
});

describe("EditingDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRowConflict.mockReturnValue({
      conflict: null,
      resolveConflict: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders header and hides zero in number input", () => {
    render(<EditingDialog {...buildProps()} />);

    expect(
      screen.getByRole("heading", { name: "Edit position" }),
    ).toBeInTheDocument();

    const numberInputs = screen.getAllByRole("spinbutton");
    expect(numberInputs).toHaveLength(1);
    expect(numberInputs[0]).toHaveValue(null);
  });

  it("calls onRemove and closes when remove is clicked", () => {
    const onRemove = vi.fn();
    const onRequestClose = vi.fn();

    render(
      <EditingDialog
        {...buildProps({
          onRemove,
          onRequestClose,
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remove"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("disables save when validator fails and shows error", () => {
    render(
      <EditingDialog
        {...buildProps({
          validator: invalidValidator,
        })}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("disables save when conflict is deleted", () => {
    mockUseRowConflict.mockReturnValue({
      conflict: { type: "deleted", message: "Item removed" },
      resolveConflict: vi.fn(),
    });

    render(<EditingDialog {...buildProps()} />);

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeDisabled();
  });
});
