import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Receipt } from "@/model/receipt/model";

const invokeMock = vi.fn();
const withStructuredOutputMock = vi.fn(() => ({
  invoke: invokeMock,
}));
const findUniqueMock = vi.fn();
const errorWrapMock = vi.fn();
const buildParticipantsMock = vi.fn();

vi.mock("@langchain/openrouter", () => ({
  ChatOpenRouter: vi.fn(function ChatOpenRouter() {
    return {
      withStructuredOutput: withStructuredOutputMock,
    };
  }),
}));

vi.mock("@/app/db", () => ({
  db: {
    receipt: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

vi.mock("@/app/db-utils/build-participants", () => ({
  buildParticipants: (...args: unknown[]) => buildParticipantsMock(...args),
}));

vi.mock("@/app/api/receipt/error-wrap", () => ({
  errorWrap: (...args: unknown[]) => errorWrapMock(...args),
}));

vi.mock("@/app/i18n/translations", () => ({
  t: (key: string) => key,
  withLanguage: (_language: string, callback: () => unknown) => callback(),
}));

const currentReceipt: Receipt = {
  meta: {
    title: "Receipt",
    currencySymbol: "$",
  },
  positions: [
    {
      id: "position-1",
      name: "Milk",
      price: 100,
      quantity: 1,
      overall: 100,
      claims: [],
    },
  ],
  fees: [],
  discounts: [],
  totals: {
    total: 100,
    grandTotal: 100,
  },
};

describe("POST /api/receipt/[id]/chat", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    withStructuredOutputMock.mockClear();
    findUniqueMock.mockReset();
    errorWrapMock.mockReset();
    buildParticipantsMock.mockReset();
    buildParticipantsMock.mockResolvedValue([
      {
        id: "participant-1",
        displayName: "Ivan",
        color: "#111111",
        kind: "REAL",
      },
    ]);
  });

  it("loads the receipt context and returns the model preview response", async () => {
    const expectedResponse = {
      type: "structural_preview" as const,
      receipt: {
        meta: {
          title: "AI draft",
          currencySymbol: "$",
        },
        positions: [
          {
            name: "Milk",
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
    };

    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
    });
    invokeMock.mockResolvedValue(expectedResponse);
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "user-1" } },
          body: {
            message: "Show a structural preview",
            history: [
              {
                role: "assistant",
                content: "Previous answer",
              },
            ],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = await POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Show a structural preview",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "receipt-1" },
      select: { data: true },
    });
    expect(withStructuredOutputMock).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual(expectedResponse);
  });

  it("maps claims-only model output into a full receipt preview", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
    });
    invokeMock.mockResolvedValue({
      type: "claims_preview",
      positions: [
        {
          id: "position-1",
          claims: [
            {
              id: "claim-1",
              participantIds: ["participant-1"],
              type: "quantity",
              value: 1,
            },
          ],
        },
      ],
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "user-1" } },
          body: {
            message: "Ivan drank the milk",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = await POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Ivan drank the milk",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response.json()).resolves.toEqual({
      type: "claims_preview",
      receipt: {
        ...currentReceipt,
        positions: [
          {
            ...currentReceipt.positions[0],
            claims: [
              {
                id: "claim-1",
                participantIds: ["participant-1"],
                type: "quantity",
                value: 1,
              },
            ],
          },
        ],
      },
    });
  });
});
