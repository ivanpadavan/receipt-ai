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
const findChatUniqueMock = vi.fn();
const upsertChatMock = vi.fn();
const updateChatMock = vi.fn();
const queryRawMock = vi.fn();
let chatState: { history: unknown[]; pending: boolean } | null = null;
const transactionMock = vi.fn((callback: (tx: unknown) => unknown) =>
  callback({
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    receiptChat: {
      findUnique: (...args: unknown[]) => findChatUniqueMock(...args),
      upsert: (...args: unknown[]) => upsertChatMock(...args),
      update: (...args: unknown[]) => updateChatMock(...args),
    },
  }),
);
const errorWrapMock = vi.fn();
const buildParticipantsMock = vi.fn();
const channelMock = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(function (statusCallback?: (status: string) => void) {
    statusCallback?.("SUBSCRIBED");
    return channelMock;
  }),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
};
const serverSupabaseMock = vi.fn();
const getUserMock = vi.fn();
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
    $transaction: (...args: unknown[]) => transactionMock(...args),
    receipt: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
    receiptChat: {
      findUnique: (...args: unknown[]) => findChatUniqueMock(...args),
      upsert: (...args: unknown[]) => upsertChatMock(...args),
      update: (...args: unknown[]) => updateChatMock(...args),
    },
  },
}));

vi.mock("@/utils/supabase/server", () => ({
  serverSupabase: (...args: unknown[]) => serverSupabaseMock(...args),
  getUser: (...args: unknown[]) => getUserMock(...args),
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
    findChatUniqueMock.mockReset();
    upsertChatMock.mockReset();
    updateChatMock.mockReset();
    queryRawMock.mockReset();
    transactionMock.mockClear();
    errorWrapMock.mockReset();
    buildParticipantsMock.mockReset();
    serverSupabaseMock.mockReset();
    getUserMock.mockReset();
    consoleInfoMock.mockClear();
    randomUuidMock.mockReset();
    chatState = {
      history: [
        {
          id: "persisted-user-1",
          role: "user",
          participantId: "participant-1",
          content: "Persisted question",
        },
        {
          id: "persisted-assistant-1",
          role: "assistant",
          response: {
            type: "question",
            message: "Persisted answer",
            events: [],
          },
        },
      ],
      pending: false,
    };
    serverSupabaseMock.mockResolvedValue({
      channel: () => channelMock,
    });
    channelMock.on.mockClear();
    channelMock.subscribe.mockClear();
    channelMock.unsubscribe.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    buildParticipantsMock.mockResolvedValue([
      {
        id: "participant-1",
        displayName: "Ivan",
        color: "#111111",
        kind: "REAL",
      },
    ]);
    getUserMock.mockResolvedValue({
      id: "participant-1",
    });
    findChatUniqueMock.mockImplementation(async () =>
      chatState
        ? {
            history: chatState.history.map((entry) =>
              typeof entry === "object" && entry !== null
                ? { ...(entry as Record<string, unknown>) }
                : entry,
            ),
            pending: chatState.pending,
          }
        : null,
    );
    upsertChatMock.mockImplementation(async ({ create, update }: any) => {
      const nextChat = {
        history: update.history,
        pending: update.pending,
      };
      chatState = chatState ? nextChat : { history: create.history, pending: create.pending };
      return chatState;
    });
    updateChatMock.mockImplementation(async ({ data }: any) => {
      if (!chatState) {
        throw new Error("Missing chat row");
      }

      chatState = {
        ...chatState,
        ...data,
      };

      return chatState;
    });
  });

  it("streams the persisted chat state as SSE", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
    });
    findChatUniqueMock.mockResolvedValueOnce({
      history: [],
      pending: false,
    });
    findChatUniqueMock.mockResolvedValueOnce({
      history: [
        {
          id: "entry-1",
          role: "user",
          participantId: "participant-1",
          content: "Hello",
        },
      ],
      pending: true,
    });

    const { GET } = await import("../route");

    const response = await GET(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "GET",
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Missing response body");
    }

    const first = await reader.read();
    const second = await reader.read();

    expect(Buffer.from(first.value ?? new Uint8Array()).toString("utf8")).toBe(
      "data: connection established\n\n",
    );
    expect(JSON.parse(Buffer.from(second.value ?? new Uint8Array()).toString("utf8").slice("data: ".length))).toEqual({
      history: [
        {
          id: "entry-1",
          role: "user",
          participantId: "participant-1",
          content: "Hello",
        },
      ],
      pending: true,
    });

    await reader.cancel();
  });

  it("returns 401 for unauthenticated SSE access", async () => {
    getUserMock.mockRejectedValueOnce(new Error("no user"));
    const { GET } = await import("../route");

    const response = await GET(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "GET",
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    expect(response.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 for non-participant SSE access", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
    });
    buildParticipantsMock.mockResolvedValueOnce([]);

    const { GET } = await import("../route");

    const response = await GET(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "GET",
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("loads the receipt context and returns the model preview response", async () => {
    randomUuidMock
      .mockReturnValueOnce("generated-user-entry-id")
      .mockReturnValueOnce("generated-position-id")
      .mockReturnValueOnce("generated-fee-id")
      .mockReturnValueOnce("generated-discount-id")
      .mockReturnValueOnce("generated-assistant-entry-id");

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
                content: "Ignored request history",
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
    expect(randomUuidMock).toHaveBeenCalledTimes(5);
    expect(prompt).toContain("Return the full structural preview without claims.");
    expect(prompt).toContain("new rows and modifiers omit `id`");
    expect(prompt).toContain('"currentUserParticipantId": "participant-1"');
    expect(prompt).toContain('"currentUserDisplayName": "Ivan"');
    expect(prompt).toContain("USER: Persisted question");
    expect(prompt).toContain("ASSISTANT: Persisted answer");
    expect(prompt).not.toContain("Ignored request history");
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(queryRawMock).toHaveBeenCalledTimes(2);
    expect(findChatUniqueMock).toHaveBeenCalledTimes(2);
    expect(upsertChatMock).toHaveBeenCalledWith({
      where: { receiptId: "receipt-1" },
      create: {
        receiptId: "receipt-1",
        history: [
          {
            id: "persisted-user-1",
            role: "user",
            participantId: "participant-1",
            content: "Persisted question",
          },
          {
            id: "persisted-assistant-1",
            role: "assistant",
            response: {
              type: "question",
              message: "Persisted answer",
              events: [],
            },
          },
          {
            id: "generated-user-entry-id",
            role: "user",
            participantId: "participant-1",
            content: "Show a structural preview",
          },
        ],
        pending: true,
      },
      update: {
        history: [
          {
            id: "persisted-user-1",
            role: "user",
            participantId: "participant-1",
            content: "Persisted question",
          },
          {
            id: "persisted-assistant-1",
            role: "assistant",
            response: {
              type: "question",
              message: "Persisted answer",
              events: [],
            },
          },
          {
            id: "generated-user-entry-id",
            role: "user",
            participantId: "participant-1",
            content: "Show a structural preview",
          },
        ],
        pending: true,
      },
    });
    expect(updateChatMock).toHaveBeenCalledWith({
      where: { receiptId: "receipt-1" },
      data: {
        history: [
          {
            id: "persisted-user-1",
            role: "user",
            participantId: "participant-1",
            content: "Persisted question",
          },
          {
            id: "persisted-assistant-1",
            role: "assistant",
            response: {
              type: "question",
              message: "Persisted answer",
              events: [],
            },
          },
          {
            id: "generated-user-entry-id",
            role: "user",
            participantId: "participant-1",
            content: "Show a structural preview",
          },
          {
            id: "generated-assistant-entry-id",
            role: "assistant",
            response: expectedResponse,
          },
        ],
        pending: false,
      },
    });
    await expect(response.json()).resolves.toEqual(expectedResponse);
  });

  it("rejects non-participants before persisting chat history", async () => {
    buildParticipantsMock.mockResolvedValueOnce([]);
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "auth-user-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Hello",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Hello",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response).rejects.toThrow("User is not a receipt participant");
    expect(transactionMock).not.toHaveBeenCalled();
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(findChatUniqueMock).not.toHaveBeenCalled();
    expect(upsertChatMock).not.toHaveBeenCalled();
    expect(updateChatMock).not.toHaveBeenCalled();
    expect(agentInvokeMock).not.toHaveBeenCalled();
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
      receiptSnapshot: currentReceipt,
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
    expect(upsertChatMock).toHaveBeenCalledTimes(1);
    expect(updateChatMock).toHaveBeenCalledTimes(1);
  });

  it("rejects claims preview with unknown participant ids", async () => {
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
                participantIds: ["unknown-participant"],
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
            message: "Claim with unknown participant",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Claim with unknown participant",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response).rejects.toThrow("AI produced malformed request");
    expect(upsertChatMock).toHaveBeenLastCalledWith({
      where: { receiptId: "receipt-1" },
      create: expect.objectContaining({
        pending: false,
      }),
      update: expect.objectContaining({
        pending: false,
      }),
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

  it("resets pending when the LLM throws", async () => {
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockRejectedValueOnce(new Error("llm boom"));
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Trigger failure",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Trigger failure",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response).rejects.toThrow("llm boom");
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(queryRawMock).toHaveBeenCalledTimes(2);
    expect(upsertChatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ pending: true }),
        update: expect.objectContaining({ pending: true }),
      }),
    );
    expect(upsertChatMock).toHaveBeenLastCalledWith({
      where: { receiptId: "receipt-1" },
      create: {
        receiptId: "receipt-1",
        history: [
          {
            id: "persisted-user-1",
            role: "user",
            participantId: "participant-1",
            content: "Persisted question",
          },
          {
            id: "persisted-assistant-1",
            role: "assistant",
            response: {
              type: "question",
              message: "Persisted answer",
              events: [],
            },
          },
        ],
        pending: false,
      },
      update: {
        history: [
          {
            id: "persisted-user-1",
            role: "user",
            participantId: "participant-1",
            content: "Persisted question",
          },
          {
            id: "persisted-assistant-1",
            role: "assistant",
            response: {
              type: "question",
              message: "Persisted answer",
              events: [],
            },
          },
        ],
        pending: false,
      },
    });
  });

  it("rejects a new turn while another turn is already pending", async () => {
    chatState = {
      history: [
        {
          id: "persisted-user-1",
          role: "user",
          participantId: "participant-1",
          content: "Another in-flight question",
        },
      ],
      pending: true,
    };
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock.mockRejectedValueOnce(new Error("llm boom"));
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Trigger failure",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Trigger failure",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(response).rejects.toMatchObject({ status: 409 });
    expect(updateChatMock).not.toHaveBeenCalled();
    expect(agentInvokeMock).not.toHaveBeenCalled();
  });

  it("removes failed user turns from history and keeps later prompts clean", async () => {
    chatState = {
      history: [
        {
          id: "persisted-user-1",
          role: "user",
          participantId: "participant-1",
          content: "Persisted question",
        },
        {
          id: "persisted-assistant-1",
          role: "assistant",
          response: {
            type: "question",
            message: "Persisted answer",
            events: [],
          },
        },
      ],
      pending: false,
    };
    findUniqueMock.mockResolvedValue({
      id: "receipt-1",
      data: currentReceipt,
      imageUrls: [],
    });
    agentInvokeMock
      .mockRejectedValueOnce(new Error("llm boom"))
      .mockResolvedValueOnce({
      structuredResponse: {
        type: "question",
        message: "Fresh answer",
      },
      });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "participant-1", user_metadata: { displayName: "Ivan" } } },
          body: {
            message: "Fresh turn",
            history: [],
          },
        }),
    );

    const { POST } = await import("../route");

    const failedResponse = POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Broken turn",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    await expect(failedResponse).rejects.toThrow("llm boom");

    const response = await POST(
      new NextRequest("http://localhost/api/receipt/receipt-1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Fresh turn",
          history: [],
        }),
      }),
      {
        params: Promise.resolve({ id: "receipt-1" }),
      },
    );

    const prompt = String(
      (agentInvokeMock.mock.calls.at(1) ?? [])[0]?.messages?.[0]?.content ?? "",
    );

    expect(prompt).not.toContain("Broken turn");
    await expect(response.json()).resolves.toEqual({
      type: "question",
      message: "Fresh answer",
      events: [],
    });
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
