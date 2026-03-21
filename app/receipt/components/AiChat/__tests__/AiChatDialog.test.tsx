import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiChatDialog } from "../AiChatDialog";
import { ReceiptFormContext } from "@/app/receipt/components/receipt-context";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { Receipt } from "@/model/receipt/model";
import { setLanguage, t } from "@/app/i18n/translations";
import type { ReceiptState } from "@/app/receipt/[id]/useReceiptFormState";
import type {
  ReceiptChatHistoryEntry,
  ReceiptChatPersisted,
  ReceiptChatResponse,
} from "@/model/receipt/schema-chat";

const sendReceiptChatMessageMock = vi.fn();

vi.mock("@/app/api-client", () => ({
  apiClient: {
    sendReceiptChatMessage: (...args: unknown[]) =>
      sendReceiptChatMessageMock(...args),
  },
}));

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

const originalEventSource = globalThis.EventSource;

function getLatestEventSource() {
  const source = MockEventSource.instances.at(-1);
  if (!source) {
    throw new Error("Expected SSE connection to be created");
  }
  return source;
}

function emitChatState(state: ReceiptChatPersisted) {
  act(() => {
    getLatestEventSource().onmessage?.({
      data: JSON.stringify(state),
    } as MessageEvent<string>);
  });
}

function createReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    meta: {
      title: "Receipt",
      currencySymbol: "₽",
      ...(overrides.meta ?? {}),
    },
    positions: [
      {
        id: "pos-1",
        name: "Burger",
        price: 100,
        quantity: 1,
        overall: 100,
        claims: [
          {
            id: "claim-1",
            type: "amount",
            value: 100,
            participantIds: ["participant-1"],
          },
        ],
      },
    ],
    fees: [],
    discounts: [],
    totals: {
      total: 100,
      grandTotal: 100,
    },
    ...overrides,
  };
}

function createStructuralWarningReceipt(): Receipt {
  return {
    meta: {
      title: "Receipt",
      currencySymbol: "₽",
    },
    positions: [
      {
        id: "pos-1",
        name: "Burger",
        price: 100,
        quantity: 1,
        overall: 100,
        claims: [
          {
            id: "claim-1",
            type: "quantity",
            value: 1,
            participantIds: ["participant-1"],
          },
        ],
      },
      {
        id: "pos-2",
        name: "Soda",
        price: 50,
        quantity: 1,
        overall: 50,
        claims: [
          {
            id: "claim-2",
            type: "quantity",
            value: 1,
            participantIds: ["participant-1"],
          },
        ],
      },
      {
        id: "pos-3",
        name: "Cake",
        price: 75,
        quantity: 1,
        overall: 75,
        claims: [],
      },
    ],
    fees: [],
    discounts: [],
    totals: {
      total: 225,
      grandTotal: 225,
    },
  };
}

function createUserHistoryEntry(
  id: string,
  content: string,
  participantId = "participant-1",
): ReceiptChatHistoryEntry {
  return {
    id,
    role: "user",
    participantId,
    content,
  };
}

function createAssistantHistoryEntry(
  id: string,
  response: ReceiptChatResponse,
): ReceiptChatHistoryEntry {
  return {
    id,
    role: "assistant",
    response,
  };
}

function createStructuralPreviewResponse(receipt: Receipt): ReceiptChatResponse {
  return {
    type: "structural_preview",
    receipt,
    events: [],
  };
}

function createClaimsPreviewResponse(
  receiptSnapshot: Receipt,
  positionClaims: NonNullable<
    Extract<ReceiptChatResponse, { type: "claims_preview" }>["positionClaims"]
  >,
): ReceiptChatResponse {
  return {
    type: "claims_preview",
    receiptSnapshot,
    positionClaims,
    events: [],
  };
}

function renderWithContext(
  ui: React.ReactElement,
  receipt: Receipt = createReceipt(),
) {
  const replaceReceiptInForm = vi.fn();
  const buildFormState = (nextReceipt: Receipt) =>
    ({
      scenario: {
        type: "summary",
        canEdit: {
          positionForm: false,
          modifierForm: false,
          totalsForm: false,
        },
        form: {
          getValues: (path?: string) => {
            if (!path) return nextReceipt;
            if (path === "meta.currencySymbol") return nextReceipt.meta.currencySymbol;
            return undefined;
          },
          watch: () => nextReceipt,
        },
      },
      openEditModal: vi.fn(),
      proceed: vi.fn(),
      canProceed: true,
      editModalProps: {
        splitting: null,
        editing: null,
      },
      replaceReceiptInForm,
    }) as unknown as ReceiptState;

  const renderWithReceipt = (nextReceipt: Receipt) =>
    render(
      <ReceiptFormContext.Provider value={buildFormState(nextReceipt)}>
        {ui}
      </ReceiptFormContext.Provider>,
    );

  const renderResult = renderWithReceipt(receipt);

  return {
    ...renderResult,
    replaceReceiptInForm,
    rerenderWithReceipt: (nextReceipt: Receipt) =>
      renderResult.rerender(
        <ReceiptFormContext.Provider value={buildFormState(nextReceipt)}>
          {ui}
        </ReceiptFormContext.Provider>,
      ),
  };
}

beforeEach(() => {
  setLanguage("en");
  sendReceiptChatMessageMock.mockReset();
  MockEventSource.instances = [];
  useParticipantsStore.setState({
    participants: [
      {
        id: "participant-1",
        displayName: "Alice",
        color: "#111111",
        kind: "REAL",
        isAnonymous: false,
        isOnline: true,
      },
    ],
  });
  globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
});

afterEach(() => {
  cleanup();
  globalThis.EventSource = originalEventSource;
});

describe("AiChatDialog", () => {
  it("renders persisted history with participant display names and shared pending state", async () => {
    renderWithContext(<AiChatDialog receiptId="receipt-1" receiptTitle="Receipt" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /ai/i }));

    emitChatState({
      history: [
        createUserHistoryEntry("user-1", "Split burger"),
        createAssistantHistoryEntry("assistant-1", {
          type: "question",
          message: "What should I change?",
          events: [],
        }),
      ],
      pending: true,
    });

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.getByText("Split burger")).toBeInTheDocument();
    expect(screen.getByText(/What should I change\?/i)).toBeInTheDocument();
    expect(screen.getByText(t("aiChatThinking"))).toBeInTheDocument();
  });

  it("submits against persisted history and shows a structural preview from the stream", async () => {
    sendReceiptChatMessageMock.mockResolvedValueOnce({
      type: "question",
      message: "ok",
      events: [],
    });

    const user = userEvent.setup();

    const { replaceReceiptInForm } = renderWithContext(
      <AiChatDialog receiptId="receipt-1" receiptTitle="Receipt" />,
      createStructuralWarningReceipt(),
    );

    await user.click(screen.getByRole("button", { name: /ai/i }));

    emitChatState({
      history: [
        createUserHistoryEntry("user-0", "Earlier context"),
        createAssistantHistoryEntry(
          "assistant-0",
          createStructuralPreviewResponse({
            meta: {
              title: "Earlier draft",
              currencySymbol: "₽",
            },
            positions: [
              {
                id: "pos-1",
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
          }),
        ),
      ],
      pending: false,
    });

    expect(await screen.findByText("Earlier context")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/ask/i), "Show a draft");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(sendReceiptChatMessageMock).toHaveBeenCalledWith(
      "receipt-1",
      expect.objectContaining({
        message: "Show a draft",
        history: [
          {
            role: "user",
            content: "Earlier context",
          },
          {
            role: "assistant",
            content: `${t("aiChatStructuralPreview")}: Earlier draft (1 ${t("positions")})`,
          },
          {
            role: "user",
            content: "Show a draft",
          },
        ],
      }),
    );

    emitChatState({
      history: [
        createUserHistoryEntry("user-0", "Earlier context"),
        createUserHistoryEntry("user-1", "Show a draft"),
        createAssistantHistoryEntry(
          "assistant-1",
          createStructuralPreviewResponse({
            meta: {
              title: "Lunch draft",
              currencySymbol: "₽",
            },
            positions: [
              {
                id: "pos-1",
                name: "Burger",
                price: 120,
                quantity: 1,
                overall: 120,
              },
              {
                id: "pos-2",
                name: "Cake",
                price: 75,
                quantity: 1,
                overall: 75,
              },
              {
                id: "pos-3",
                name: "Fries",
                price: 50,
                quantity: 1,
                overall: 50,
              },
            ],
            fees: [],
            discounts: [],
            totals: {
              total: 245,
              grandTotal: 245,
            },
          }),
        ),
      ],
      pending: false,
    });

    expect(await screen.findByText("Burger")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply/i }));

    const modal = await screen.findByRole("alertdialog");
    expect(within(modal).getByText(/apply structural changes\?/i)).toBeInTheDocument();

    await user.click(within(modal).getByRole("button", { name: /apply/i }));
    expect(replaceReceiptInForm).toHaveBeenCalledTimes(1);
  });

  it("restores draft text when send request fails", async () => {
    sendReceiptChatMessageMock.mockRejectedValueOnce(new Error("network"));

    const user = userEvent.setup();
    renderWithContext(<AiChatDialog receiptId="receipt-1" receiptTitle="Receipt" />);

    await user.click(screen.getByRole("button", { name: /ai/i }));
    await user.type(screen.getByPlaceholderText(/ask/i), "Retry me");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Retry me")).toBeInTheDocument();
    });
  });

  it("renders claims preview responses from the stream and keeps apply flows working", async () => {
    const user = userEvent.setup();

    const { replaceReceiptInForm } = renderWithContext(
      <AiChatDialog receiptId="receipt-1" receiptTitle="Receipt" />,
      createReceipt(),
    );

    await user.click(screen.getByRole("button", { name: /ai/i }));

    emitChatState({
      history: [
        createUserHistoryEntry("user-1", "Split burger"),
        createAssistantHistoryEntry(
          "assistant-1",
          createClaimsPreviewResponse(createReceipt(), {
            "pos-1": [
              {
                type: "amount",
                value: 90,
                participantIds: ["participant-1"],
              },
            ],
          }),
        ),
      ],
      pending: false,
    });

    expect(await screen.findByText("Burger")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply/i }));
    const modal = await screen.findByRole("alertdialog");
    expect(within(modal).getByRole("button", { name: /replace all/i })).toBeInTheDocument();

    await user.click(within(modal).getByRole("button", { name: /replace all/i }));
    expect(replaceReceiptInForm).toHaveBeenCalledTimes(1);
  });
});
