import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { SplittingSheet } from "../SplittingSheet";
import { ParticipantDTO, ReceiptPosition } from "@/model/receipt/model";
import { useParticipantsStore } from "@/app/receipt/store/participants";

// --- Mocks ---

// Mock useReceiptState to provide participants
const mockParticipants: ParticipantDTO[] = [
  { id: "p1", displayName: "Alice", color: "#FF0000", kind: "REAL" },
  { id: "p2", displayName: "Bob", color: "#00FF00", kind: "MOCK" },
];

const mockReceiptState = {
  scenario: {
    form: {
      control: {},
    },
  },
};

vi.mock("../../ReceiptForm", () => ({
  useReceiptState: () => mockReceiptState,
}));

// Mock react-hook-form useWatch
vi.mock("react-hook-form", () => ({
  useWatch: (args?: any) => (args?.name ? args?.name : mockParticipants),
}));

// Mock useUser
const mockUser = { id: "p1", email: "alice@example.com" }; // Alice is current user
vi.mock("@/context/AuthContext", () => ({
  useUser: () => ({ user: mockUser }),
}));

// Mock translations
vi.mock("@/app/i18n/translations", () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      quantity: "pcs",
      amount: "RUB",
      addShare: "Add Share",
      done: "Done",
      distributed: "Distributed",
      edit: "Edit",
      delete: "Delete",
    };
    return translations[key] || key;
  },
}));

// Mock Drawer components
vi.mock("@/components/ui/drawer", () => ({
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drawer-content">{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DrawerFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drawer-footer">{children}</div>
  ),
  DrawerClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWithinDrawerContext: () => ({ closing: false }),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe("SplittingSheet Integration", () => {
  const defaultPosition: ReceiptPosition = {
    id: "pos-1",
    name: "Test Position",
    price: 100,
    quantity: 2,
    overall: 200,
    claims: [
      { id: "claim-1", value: 1, type: "quantity", participantIds: ["p2"] }, // Bob claims 1 item
    ],
  };

  let onSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders position info and existing claims", () => {
    useParticipantsStore.setState({
      participants: mockParticipants,
      initialized: true,
    });
    render(
      <SplittingSheet
        initialValue={defaultPosition}
        onSave={onSave}
        fieldType="position"
        header="name"
      />,
    );

    // Check header
    expect(screen.getByText("Test Position")).toBeInTheDocument();
    const priceInfo = screen.getAllByText(/200 ₽/);
    expect(priceInfo.length).toBeGreaterThan(0);

    // Check existing claim (Bob)
    expect(screen.getByText("1")).toBeInTheDocument();
    const bobAvatars = screen.getAllByText("B");
    expect(bobAvatars.length).toBeGreaterThan(0);
  });

  it("opens adding new share by default if not present in initial", () => {
    const posWithoutNew = { ...defaultPosition };

    useParticipantsStore.setState({
      participants: mockParticipants,
      initialized: true,
    });
    render(
      <SplittingSheet
        initialValue={posWithoutNew}
        onSave={onSave}
        fieldType="position"
        header="name"
      />,
    );

    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toHaveAttribute("placeholder", "0");
    expect(inputs[0]).toHaveValue(null);

    expect(screen.queryByText("+ Add Share")).not.toBeInTheDocument();
  });

  it("allows adding a new claim", async () => {
    useParticipantsStore.setState({
      participants: mockParticipants,
      initialized: true,
    });
    render(
      <SplittingSheet
        initialValue={defaultPosition}
        onSave={onSave}
        fieldType="position"
        header="name"
      />,
    );

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0.5" } });

    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText("0.5")).toBeInTheDocument();
    });

    expect(input).not.toBeInTheDocument();

    expect(screen.getByText("+ Add Share")).toBeInTheDocument();
  });

  it("saves all changes including new valid draft when Done is clicked", async () => {
    render(
      <SplittingSheet
        initialValue={defaultPosition}
        onSave={onSave}
        fieldType="position"
        header="name"
      />,
    );

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0.5" } });

    fireEvent.click(screen.getByText("Done"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedData = onSave.mock.calls[0][0] as ReceiptPosition;

    expect(savedData.claims).toHaveLength(2);
    expect(savedData.claims[1].value).toBe(0.5);
    expect(savedData.claims[1].participantIds).toContain("p1");
  });

  it("updates existing claim", async () => {
    render(
      <SplittingSheet
        initialValue={defaultPosition}
        onSave={onSave}
        fieldType="position"
        header="name"
      />,
    );

    const claimValue = screen.getByText("1");
    expect(claimValue).toBeInTheDocument();

    fireEvent.click(screen.getByText("Done"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        claims: expect.arrayContaining([expect.objectContaining({ value: 1 })]),
      }),
    );
  });
});
