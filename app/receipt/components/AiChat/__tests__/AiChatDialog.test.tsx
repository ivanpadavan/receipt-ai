import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiChatDialog } from "../AiChatDialog";
import { ReceiptFormContext } from "@/app/receipt/components/receipt-context";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { Receipt } from "@/model/receipt/model";
import { setLanguage } from "@/app/i18n/translations";
import type { ReceiptState } from "@/app/receipt/[id]/useReceiptFormState";

const sendReceiptChatMessageMock = vi.fn();

vi.mock("@/app/api-client", () => ({
  apiClient: {
    sendReceiptChatMessage: (...args: unknown[]) =>
      sendReceiptChatMessageMock(...args),
  },
}));

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

function renderWithContext(ui: React.ReactElement) {
  const formState = {
    scenario: {
      type: "summary",
      canEdit: {
        positionForm: false,
        modifierForm: false,
        totalsForm: false,
      },
      form: {
        getValues: (path?: string) => {
          if (path === "meta.currencySymbol") return "₽";
          return undefined;
        },
      },
    },
    openEditModal: vi.fn(),
    proceed: vi.fn(),
    canProceed: true,
    editModalProps: {
      splitting: null,
      editing: null,
    },
  } as unknown as ReceiptState;

  return render(
    <ReceiptFormContext.Provider value={formState}>
      {ui}
    </ReceiptFormContext.Provider>,
  );
}

beforeEach(() => {
  setLanguage("en");
  sendReceiptChatMessageMock.mockReset();
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
});

describe("AiChatDialog", () => {
  it("renders question, structural preview, and claims preview responses", async () => {
    sendReceiptChatMessageMock
      .mockResolvedValueOnce({
        type: "question",
        message: "What should I change?",
        events: [],
      })
      .mockResolvedValueOnce({
        type: "structural_preview",
        receipt: {
          meta: {
            title: "Lunch draft",
            currencySymbol: "₽",
          },
          positions: [
            {
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
        },
        events: [],
      })
      .mockResolvedValueOnce({
        type: "claims_preview",
        receipt: createReceipt(),
        events: [
          {
            type: "requested_receipt_images",
            imageCount: 2,
          },
        ],
      });

    const user = userEvent.setup();

    renderWithContext(<AiChatDialog receiptId="receipt-1" receiptTitle="Receipt" />);

    await user.click(screen.getByRole("button", { name: /ai/i }));
    await user.type(
      screen.getByPlaceholderText(/ask/i),
      "Split burger with Alice",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(sendReceiptChatMessageMock).toHaveBeenNthCalledWith(
      1,
      "receipt-1",
      expect.objectContaining({
        history: [
          expect.objectContaining({
            role: "user",
            content: "Split burger with Alice",
          }),
        ],
      }),
    );

    expect(
      await screen.findByText("What should I change?"),
    ).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/ask/i),
      "Show structural preview",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Lunch draft")).toBeInTheDocument();
    expect(screen.getByText("Burger")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/ask/i), "Show claims preview");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/AI requested the original receipt photos/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    expect(screen.getAllByText("100 ₽").length).toBeGreaterThan(0);
    expect(sendReceiptChatMessageMock).toHaveBeenNthCalledWith(
      3,
      "receipt-1",
      expect.objectContaining({
        history: expect.arrayContaining([
          expect.objectContaining({
            role: "assistant",
            content: expect.stringContaining("Structural preview"),
          }),
        ]),
      }),
    );
  });
});
