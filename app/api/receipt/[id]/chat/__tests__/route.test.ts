import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Receipt } from "@/model/receipt/model";

const agentInvokeMock = vi.fn();
const structuredInvokeMock = vi.fn();
const createAgentMock = vi.fn(() => ({
  invoke: agentInvokeMock,
}));
const toolMock = vi.fn(
  (
    fn: (input: Record<string, never> | Record<string, number>) => unknown,
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
const randomUuidMock = vi.spyOn(globalThis.crypto, "randomUUID");

vi.mock("langchain", () => ({
  createAgent: createAgentMock,
  tool: toolMock,
  toolStrategy: (schema: unknown) => schema,
}));

vi.mock("@langchain/openrouter", () => ({
  ChatOpenRouter: vi.fn(function ChatOpenRouter() {
    return {
      withStructuredOutput: vi.fn(() => ({
        invoke: structuredInvokeMock,
      })),
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
    vi.resetModules();
    agentInvokeMock.mockReset();
    createAgentMock.mockClear();
    toolMock.mockClear();
    structuredInvokeMock.mockReset();
    findUniqueMock.mockReset();
    errorWrapMock.mockReset();
    buildParticipantsMock.mockReset();
    consoleInfoMock.mockClear();
    randomUuidMock.mockReset();
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
    randomUuidMock
      .mockReturnValueOnce("generated-position-id")
      .mockReturnValueOnce("generated-fee-id")
      .mockReturnValueOnce("generated-discount-id");

    const llmResponse = {
      type: "structural_preview" as const,
      receipt: {
        meta: {
          title: "AI draft",
          currencySymbol: "$",
        },
        positions: [
          {
            id: "position-1",
            name: "Milk",
            price: 100,
            quantity: 1,
            overall: 100,
          },
          {
            name: "Juice",
            price: 25,
            quantity: 1,
            overall: 25,
          },
        ],
        fees: [
          {
            name: "Service",
            value: 15,
          },
        ],
        discounts: [
          {
            name: "Promo",
            value: 10,
          },
        ],
        totals: {
          total: 125,
          grandTotal: 130,
        },
      },
    };
    const expectedResponse = {
      ...llmResponse,
      events: [],
      receipt: {
        ...llmResponse.receipt,
        positions: [
          llmResponse.receipt.positions[0],
          {
            id: "generated-position-id",
            ...llmResponse.receipt.positions[1],
          },
        ],
        fees: [
          {
            id: "generated-fee-id",
            ...llmResponse.receipt.fees[0],
          },
        ],
        discounts: [
          {
            id: "generated-discount-id",
            ...llmResponse.receipt.discounts[0],
          },
        ],
      },
    };

    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockResolvedValue({
      structuredResponse: llmResponse,
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
    expect(randomUuidMock).toHaveBeenCalledTimes(3);
    expect(prompt).toContain("Return the full structural preview without claims.");
    expect(prompt).toContain("new rows and modifiers omit `id`");
    expect(prompt).toContain('"currentUserParticipantId": "participant-1"');
    expect(prompt).toContain('"currentUserDisplayName": "Ivan"');
    await expect(response.json()).resolves.toEqual(expectedResponse);
  });

  it("maps claims-only model output from positions into a full receipt preview", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockResolvedValue({
      structuredResponse: {
        type: "claims_preview",
        positions: [
          {
            ...currentReceipt.positions[0],
            claims: [
              {
                participantIds: ["participant-1"],
                type: "quantity",
                value: 1,
              },
            ],
          },
        ],
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
            participantIds: ["participant-1"],
            type: "quantity",
            value: 1,
          },
        ],
      },
      events: [],
    });
  });

  it("rejects claims preview when a position field changes", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockResolvedValue({
      structuredResponse: {
        type: "claims_preview",
        positions: [
          {
            ...currentReceipt.positions[0],
            name: "Milk plus",
            claims: [],
          },
        ],
      },
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Change the claim",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Change the claim",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response).rejects.toThrow("AI produced malformed request");
  });

  it("rejects claims preview when positions are added or removed", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockResolvedValue({
      structuredResponse: {
        type: "claims_preview",
        positions: [
          ...currentReceipt.positions,
          {
            id: "position-2",
            name: "Bread",
            price: 25,
            quantity: 1,
            overall: 25,
            claims: [],
          },
        ],
      },
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Change the claim",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Change the claim",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response).rejects.toThrow("AI produced malformed request");
  });

  it("rejects claims preview when positions are returned in a different order", async () => {
    const twoPositionReceipt: Receipt = {
      ...currentReceipt,
      positions: [
        currentReceipt.positions[0],
        {
          id: "position-2",
          name: "Bread",
          price: 25,
          quantity: 1,
          overall: 25,
          claims: [],
        },
      ],
    };

    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: twoPositionReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockResolvedValue({
      structuredResponse: {
        type: "claims_preview",
        positions: [twoPositionReceipt.positions[1], twoPositionReceipt.positions[0]],
      },
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Change the claim",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Change the claim",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response).rejects.toThrow("AI produced malformed request");
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
          message: "Intermediate answer should be replaced by the multimodal pass.",
        },
      };
    });
    structuredInvokeMock.mockResolvedValue({
      type: "question",
      message: "I checked the original photos. Who had the borscht?",
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
    expect(structuredInvokeMock).toHaveBeenCalledTimes(1);
    const multimodalCall = structuredInvokeMock.mock.calls[0]?.[0];
    const content = multimodalCall?.[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]?.type).toBe("text");
    expect(content[1]?.type).toBe("image_url");
    expect(content[1]?.image_url).toBe(
      "https://example.supabase.co/storage/v1/object/public/receipts/user-1/receipt-1.png",
    );
    expect(content[2]?.image_url).toBe(
      "https://example.supabase.co/storage/v1/object/public/receipts/user-1/receipt-2.png",
    );
  });

});
