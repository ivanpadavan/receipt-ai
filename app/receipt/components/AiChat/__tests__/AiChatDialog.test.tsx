import React from "react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiChatDialog } from "../AiChatDialog";
import { ReceiptFormContext } from "@/app/receipt/components/receipt-context";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { Receipt } from "@/model/receipt/model";
import { setLanguage, t } from "@/app/i18n/translations";
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

function renderWithContext(ui: React.ReactElement, receipt: Receipt = createReceipt()) {
  const replaceReceiptInForm = vi.fn();
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
          if (!path) return receipt;
          if (path === "meta.currencySymbol") return receipt.meta.currencySymbol;
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
    replaceReceiptInForm,
  } as unknown as ReceiptState;

  const renderResult = render(
    <ReceiptFormContext.Provider value={formState}>
      {ui}
    </ReceiptFormContext.Provider>,
  );

  return {
    ...renderResult,
    replaceReceiptInForm,
  };
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

afterEach(() => {
  cleanup();
});

describe("AiChatDialog", () => {
  it("renders structural diff rows and opens the confirm modal before apply", async () => {
    sendReceiptChatMessageMock
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
              price: 120,
              quantity: 1,
              overall: 120,
            },
            {
              name: "Cake",
              price: 75,
              quantity: 1,
              overall: 75,
            },
            {
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
        },
        events: [],
      })
      .mockResolvedValueOnce({
        type: "question",
        message: "What should I change?\nKeep it short.",
        events: [],
      });

    const user = userEvent.setup();

    const { replaceReceiptInForm } = renderWithContext(
      <AiChatDialog receiptId="receipt-1" receiptTitle="Receipt" />,
      createStructuralWarningReceipt(),
    );

    await user.click(screen.getByRole("button", { name: /ai/i }));
    await user.type(
      screen.getByPlaceholderText(/ask/i),
      "Show a draft",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("Fries")).toBeInTheDocument();
    expect(screen.getAllByText("Changed").length).toBeGreaterThan(1);
    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review changes/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /review changes/i }));

    const modal = await screen.findByRole("alertdialog");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/apply structural changes\?/i)).toBeInTheDocument();
    expect(within(modal).getByText(/claims that may be lost/i)).toBeInTheDocument();
    expect(within(modal).getByText(`Alice — Soda 1 ${t("pcs")}`)).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: /apply/i })).toBeInTheDocument();

    await user.click(within(modal).getByRole("button", { name: /apply/i }));
    expect(replaceReceiptInForm).toHaveBeenCalledTimes(1);
  });

  it("renders question, structural preview, and distributions preview responses", async () => {
    sendReceiptChatMessageMock
      .mockResolvedValueOnce({
        type: "question",
        message: "What should I change?\nKeep it short.",
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
              price: 120,
              quantity: 1,
              overall: 120,
            },
          ],
          fees: [],
          discounts: [],
          totals: {
            total: 120,
            grandTotal: 120,
          },
        },
        events: [],
      })
      .mockResolvedValueOnce({
        type: "claims_preview",
        receipt: createReceipt(),
        positionClaims: {
          "pos-1": [
            {
              id: "claim-2",
              type: "amount",
              value: 100,
              participantIds: ["participant-1"],
            },
          ],
        },
        events: [
          {
            type: "requested_receipt_images",
            imageCount: 2,
          },
        ],
      });

    const user = userEvent.setup();

    renderWithContext(
      <AiChatDialog receiptId="receipt-1" receiptTitle="Receipt" />,
      createStructuralWarningReceipt(),
    );

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

    const questionText = await screen.findByText(/What should I change\?/i);
    expect(questionText).toBeInTheDocument();
    expect(questionText).toHaveClass("whitespace-pre-wrap");

    await user.type(
      screen.getByPlaceholderText(/ask/i),
      "Show structural preview",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Lunch draft")).toBeInTheDocument();
    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getAllByText("Removed").length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText(/ask/i), "Show distributions preview");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/AI requested the original receipt photos/i)).toBeInTheDocument();

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
