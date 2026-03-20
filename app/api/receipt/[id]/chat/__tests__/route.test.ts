import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Receipt } from "@/model/receipt/model";

const agentInvokeMock = vi.fn();
const createAgentMock = vi.fn(() => ({
  invoke: agentInvokeMock,
}));
const toolMock = vi.fn(
  (
    fn: (input: Record<string, never>) => unknown,
    options: { name: string; description: string },
  ) => ({
    invoke: fn,
    ...options,
  }),
);
const findUniqueMock = vi.fn();
const errorWrapMock = vi.fn();
const buildParticipantsMock = vi.fn();
const consoleInfoMock = vi.spyOn(console, "info").mockImplementation(() => {});

vi.mock("langchain", () => ({
  createAgent: createAgentMock,
  tool: toolMock,
  toolStrategy: (schema: unknown) => schema,
}));

vi.mock("@langchain/openrouter", () => ({
  ChatOpenRouter: vi.fn(function ChatOpenRouter() {
    return {};
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
    vi.resetModules();
    agentInvokeMock.mockReset();
    createAgentMock.mockClear();
    toolMock.mockClear();
    findUniqueMock.mockReset();
    errorWrapMock.mockReset();
    buildParticipantsMock.mockReset();
    consoleInfoMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
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
      events: [],
    };

    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockResolvedValue({
      structuredResponse: expectedResponse,
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
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

    const prompt = String(
      (agentInvokeMock.mock.calls.at(0) ?? [])[0]?.messages?.[0]?.content ?? "",
    );

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "receipt-1" },
      select: { data: true, imageUrls: true },
    });
    expect(createAgentMock).toHaveBeenCalled();
    expect(agentInvokeMock).toHaveBeenCalledTimes(1);
    expect(prompt).toContain("positionClaims: Record<string, claim[]>");
    expect(prompt).not.toContain("positionId, claims");
    expect(prompt).toContain('"currentUserParticipantId": "participant-1"');
    expect(prompt).toContain('"currentUserDisplayName": "Ivan"');
    await expect(response.json()).resolves.toEqual(expectedResponse);
  });

  it("maps claims-only model output into a full receipt preview", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockResolvedValue({
      structuredResponse: {
        type: "claims_preview",
        positionClaims: {
          "position-1": [
            {
              id: "claim-1",
              participantIds: ["participant-1"],
              type: "quantity",
              value: 1,
            },
          ],
        },
        events: [],
      },
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
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
      positionClaims: {
        "position-1": [
          {
            id: "claim-1",
            participantIds: ["participant-1"],
            type: "quantity",
            value: 1,
          },
        ],
      },
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
      events: [],
    });
  });

  it("logs and exposes an event when the agent requests original receipt images", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [
        "receipts/user-1/receipt-1.png",
        "receipts/user-1/receipt-2.png",
      ],
    });
    agentInvokeMock.mockImplementation(async () => {
      const [{ tools }] = (createAgentMock.mock.calls.at(-1) ?? []) as unknown as [
        {
          tools: Array<{
            name: string;
            invoke: (input: Record<string, never>) => Promise<unknown>;
          }>;
        },
      ];
      await tools[0].invoke({});

      return {
        structuredResponse: {
          type: "question",
          message: "I checked the original photos. Who had the borscht?",
          events: [],
        },
      };
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Use the original photos if needed",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = await POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Use the original photos if needed",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response.json()).resolves.toEqual({
      type: "question",
      message: "I checked the original photos. Who had the borscht?",
      events: [
        {
          type: "requested_receipt_images",
          imageCount: 2,
        },
      ],
    });
    expect(consoleInfoMock).toHaveBeenCalledWith("receipt_chat_tool_call", {
      receiptId: "receipt-1",
      toolName: "get_receipt_images",
      imageCount: 2,
    });
  });
});
