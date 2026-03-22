import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/prisma/generated/prisma/client";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage } from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import { inspect } from "node:util";
import { isEqual } from "lodash-es";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import validator from "@/app/api/receipt/[id]/chat/validator";
import { db } from "@/app/db";
import {
  receiptChatLiveSchema,
  receiptChatPersistedSchema,
  receiptChatModelResponseSchema,
  receiptChatModelResponseSchemas,
  receiptChatStructuralPreviewModelResponseSchema,
  receiptChatResponseSchema,
  type ReceiptChatResponse,
  type ReceiptChatToolEvent,
} from "@/model/receipt/schema-chat";
import { withLanguage } from "@/app/i18n/translations";
import { buildParticipants } from "@/app/db-utils/build-participants";
import type { Receipt } from "@/model/receipt/model";
import {
  reduceClaimsPreviewReceipt,
} from "@/model/receipt/claims-preview";
import {
  convertChatHistoryToLLM,
  createAssistantChatEntry,
  createUserChatEntry,
} from "@/app/api/receipt/[id]/chat/chat-history";
import { createSseResponse } from "@/app/api/receipt/sse";
import { getUser, serverSupabase } from "@/utils/supabase/server";
import { BehaviorSubject, distinctUntilChanged, finalize, tap } from "rxjs";
import { repairWithBusinessValidation } from "@/app/api/receipt/math-repair-chain";
import { receiptImageInstructions } from "@/app/api/receipt/prompts";

export const runtime = "nodejs";

const model = new ChatOpenRouter({
  temperature: 0.2,
  model: process.env.OPENROUTER_API_MODEL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

const structuredChatResponseModel = model.withStructuredOutput(
  receiptChatModelResponseSchema,
  {
    name: "receipt_chat_response",
  },
);

function formatHistory(
  history: { role: "user" | "assistant"; content: string }[],
) {
  if (history.length === 0) {
    return "No previous chat history.";
  }

  return history
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
    .join("\n");
}

async function createReceiptImageUrls(imageUrls: string[]) {
  if (imageUrls.length === 0) {
    return [];
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return imageUrls.map(
    (path) => `${baseUrl}/storage/v1/object/public/${path}`,
  );
}

function buildReceiptChatPrompt({
  receipt,
  participants,
  currentUser,
  history,
  message,
}: {
  receipt: Receipt;
  participants: { id: string; displayName: string }[];
  currentUser: { id: string; displayName: string };
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}) {
  return (
    "You are helping the user edit a receipt through chat.\n" +
    "Return exactly one structured response.\n" +
    "Allowed response types:\n" +
    "- `question`: when clarification is required before making a preview. `message` must be plain text only.\n" +
    "- `structural_preview`: when you are proposing a changed receipt structure. Return the full structural preview without claims. Existing rows and modifiers must carry their current `id`; new rows and modifiers omit `id`.\n" +
    "- `claims_preview`: when you are proposing how claims should be filled. Return only the `positions` array, not the full receipt. Keep the same position ids, order, and item fields as the original receipt. Only claims may differ.\n" +
    "You may call `get_receipt_images` if the original photos are needed.\n" +
    "For `question`, use only plain text with optional newline characters.\n" +
    "For `question`, do not use markdown, bullet lists, numbered lists, or JSON.\n" +
    "For `question`, keep the answer short and direct.\n" +
    "If the user asks for a count or a single fact, answer with that fact in the first sentence.\n" +
    "Keep unchanged fields from the current receipt when generating previews.\n" +
    "For claims preview, keep the existing positions unchanged except for claims.\n" +
    "For claims preview, return only the positions array in the same order as the current receipt.\n" +
    "For claims preview, reference participants by `id`.\n" +
    "Use the provided participants list with display names when resolving who the user means.\n\n" +
    `Current user context:\n${JSON.stringify(currentUser, null, 2,)}\n\n` +
    `Current receipt JSON:\n${JSON.stringify(receipt, null, 2)}\n\n` +
    `Participants JSON:\n${JSON.stringify(participants, null, 2)}\n\n` +
    `Chat history:\n${formatHistory(history)}\n\n` +
    `User got this receipt using images u can (but not must) query using provided tool and this prompt:\n${receiptImageInstructions}\n\n` +
    `Latest user message:\n${message}`
  );
}

function assignMissingIds<T extends { id?: string }>(items: T[]) {
  return items.map((item) =>
    item.id
      ? item
      : {
          ...item,
          id: crypto.randomUUID(),
    },
  );
}

async function lockReceiptChatRow<T>(
  receiptId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`
      SELECT 1
      FROM public."Receipt"
      WHERE id = ${receiptId}
      FOR UPDATE
    `;

    return callback(tx);
  });
}

async function generateReceiptChatResponse({
  receiptId,
  receipt,
  imageUrls,
  participants,
  currentUser,
  history,
  message,
}: {
  receiptId: string;
  receipt: Receipt;
  imageUrls: string[];
  participants: { id: string; displayName: string }[];
  currentUser: { id: string; displayName: string };
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}) {
  const events: ReceiptChatToolEvent[] = [];
  let requestedReceiptImages: string[] = [];

  const getReceiptImages = tool(
    async () => {
      const signedImageUrls = await createReceiptImageUrls(imageUrls);
      const event: ReceiptChatToolEvent = {
        type: "requested_receipt_images",
        imageCount: signedImageUrls.length,
      };

      events.push(event);
      requestedReceiptImages = signedImageUrls;
      console.info("receipt_chat_tool_call", {
        receiptId,
        toolName: "get_receipt_images",
        imageCount: signedImageUrls.length,
      });

      return {
        imageUrls: signedImageUrls,
      };
    },
    {
      name: "get_receipt_images",
      description:
        "Get original receipt photos as public URLs when the text context is not enough.",
      schema: z.object({}),
    },
  );

  const prompt = buildReceiptChatPrompt({
    receipt,
    participants,
    currentUser,
    history,
    message,
  });

  let result;
  try {
    const agent = createAgent({
      model,
      tools: [getReceiptImages],
      responseFormat: receiptChatModelResponseSchemas,
      systemPrompt:
        "Help the user edit the receipt. Use tools when needed, then produce the final structured response.",
    });

    result = await agent.invoke({
      messages: [new HumanMessage(prompt)],
    });

    if (requestedReceiptImages.length > 0) {
      result = {
        structuredResponse: await structuredChatResponseModel.invoke([
          new HumanMessage({
            content: [
              {
                type: "text",
                text:
                  `${prompt}\n\n` +
                  "The original receipt photos requested by the model are attached below. Use them to answer precisely.",
              },
              ...requestedReceiptImages.map((imageUrl) => ({
                type: "image_url" as const,
                image_url: imageUrl,
              })),
            ],
          }),
        ]),
      };
    }
  } catch (error) {
    console.error(
      "receipt_chat_agent_error",
      inspect(
        {
          receiptId,
          responseFormats: ["question", "structural_preview", "claims_preview"],
          error,
        },
        { depth: 6, breakLength: 120 },
      ),
    );
    throw error;
  }

  let structuredResponse = receiptChatModelResponseSchema.parse(
    result.structuredResponse,
  );

  if (structuredResponse.type === "structural_preview") {
    const repairedReceipt = await repairWithBusinessValidation({
      receipt: structuredResponse.receipt,
      model,
      schema: receiptChatStructuralPreviewModelResponseSchema.shape.receipt,
      prompt,
      telemetry: {
        label: "receipt_chat_structural_preview",
        meta: { receiptId },
      },
    });
    structuredResponse = {
      ...structuredResponse,
      receipt: repairedReceipt,
    };
  }

  const normalizedResponse =
    structuredResponse.type === "structural_preview"
      ? {
          ...structuredResponse,
          receipt: {
            ...structuredResponse.receipt,
            positions: assignMissingIds(structuredResponse.receipt.positions),
            fees: assignMissingIds(structuredResponse.receipt.fees),
            discounts: assignMissingIds(structuredResponse.receipt.discounts),
          },
        }
      : structuredResponse;

  return {
    ...normalizedResponse,
    events,
  };
}

function toApiResponse(
  receipt: Receipt,
  response: Awaited<ReturnType<typeof generateReceiptChatResponse>>,
): ReceiptChatResponse {
  if (response.type !== "claims_preview") {
    return receiptChatResponseSchema.parse(response);
  }

  const positionClaims = reduceClaimsPreviewReceipt(receipt, {
    positions: response.positions,
  });

  return receiptChatResponseSchema.parse({
    type: "claims_preview",
    receiptSnapshot: receipt,
    positionClaims,
    events: response.events,
  });
}

function toLiveChat(
  persisted: ReturnType<typeof receiptChatPersistedSchema.parse>,
  displayName: string,
) {
  return receiptChatLiveSchema.parse({
    ...persisted,
    history: persisted.history.map((entry) =>
      entry.role === "user"
        ? {
            ...entry,
            displayName,
          }
        : entry,
    ),
  });
}

function validateClaimsPreviewParticipantIds(
  response: ReceiptChatResponse,
  participants: { id: string }[],
) {
  if (response.type !== "claims_preview") return;

  const participantIds = new Set(participants.map((participant) => participant.id));

  for (const claims of Object.values(response.positionClaims)) {
    for (const claim of claims) {
      for (const participantId of claim.participantIds) {
        if (!participantIds.has(participantId)) {
          throw Object.assign(
            new Error("AI produced malformed request"),
            { status: 422 },
          );
        }
      }
    }
  }
}

const receiptChatSelect = {
  history: true,
  pending: true,
} as const;

type ReceiptChatStateUpdate = Pick<
  z.infer<typeof receiptChatPersistedSchema>,
  "history" | "pending"
>;

function chatWhere(receiptId: string, userId: string) {
  return {
    receiptId_userId: {
      receiptId,
      userId,
    },
  };
}

async function readReceiptChat(
  client: Prisma.TransactionClient | typeof db,
  receiptId: string,
  userId: string,
) {
  return receiptChatPersistedSchema.parse(
    (await client.receiptChat.findUnique({
      where: chatWhere(receiptId, userId),
      select: receiptChatSelect,
    })) ?? {},
  );
}

async function upsertReceiptChat(
  client: Prisma.TransactionClient | typeof db,
  receiptId: string,
  userId: string,
  data: ReceiptChatStateUpdate,
) {
  await client.receiptChat.upsert({
    where: chatWhere(receiptId, userId),
    create: {
      receiptId,
      userId,
      ...data,
    },
    update: data,
  });
}

async function updateReceiptChat(
  client: Prisma.TransactionClient,
  receiptId: string,
  userId: string,
  data: ReceiptChatStateUpdate,
) {
  await client.receiptChat.update({
    where: chatWhere(receiptId, userId),
    data,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;

  return withLanguage("en", () =>
    errorWrap(req, validator, async ({ session, body }) => {
      if (!session.user) {
        throw Object.assign(new Error("Unauthorized"), { status: 401 });
      }

      const receipt = await db.receipt.findUnique({
        where: { id: receiptId },
        select: { data: true, imageUrls: true },
      });

      if (!receipt) {
        throw Object.assign(new Error("Receipt not found"), { status: 404 });
      }

      const currentUserId = session.user.id;
      const currentUserDisplayName = session.user.user_metadata.displayName;

      const userEntry = createUserChatEntry(
        crypto.randomUUID(),
        session.user.id,
        body.message,
      );

      const chatHistory = await lockReceiptChatRow(receiptId, async (tx) => {
        const currentChat = await readReceiptChat(tx, receiptId, currentUserId);
        if (currentChat.pending) {
          throw Object.assign(
            new Error("Another chat turn is already in flight"),
            { status: 409 },
          );
        }
        const nextHistory = [...currentChat.history, userEntry];

        await upsertReceiptChat(tx, receiptId, currentUserId, {
          history: nextHistory,
          pending: true,
        });

        return convertChatHistoryToLLM(nextHistory);
      });

      try {
        const participants = await buildParticipants(receiptId);

        const response = await generateReceiptChatResponse({
          receiptId,
          receipt: receipt.data as Receipt,
          imageUrls: receipt.imageUrls,
          participants,
          currentUser: {
            id: currentUserId,
            displayName: currentUserDisplayName
          },
          history: chatHistory,
          message: body.message,
        });

        const responseJson = validator.response.parse(
          toApiResponse(receipt.data as Receipt, response),
        );
        validateClaimsPreviewParticipantIds(responseJson, participants);
        const assistantEntry = createAssistantChatEntry(
          crypto.randomUUID(),
          responseJson,
        );

        await lockReceiptChatRow(receiptId, async (tx) => {
          const currentChat = await readReceiptChat(tx, receiptId, currentUserId);
          const nextHistory = [...currentChat.history, assistantEntry];

          await updateReceiptChat(tx, receiptId, currentUserId, {
            history: nextHistory,
            pending: false,
          });
        });

        return NextResponse.json(responseJson);
      } catch (error) {
        await lockReceiptChatRow(receiptId, async (tx) => {
          const currentChat = await readReceiptChat(tx, receiptId, currentUserId);
          const nextHistory = currentChat.history.filter(
            (entry) => entry.id !== userEntry.id,
          );

          await upsertReceiptChat(tx, receiptId, currentUserId, {
            history: nextHistory,
            pending: false,
          });
        });
        throw error;
      }
    }),
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;
  const user = await getUser().catch(() => null);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
    select: { id: true },
  });

  if (!receipt) {
    return new Response("Receipt not found", { status: 404 });
  }

  const initialChat = await readReceiptChat(db, receiptId, user.id);
  const initialLiveChat = toLiveChat(initialChat, user.user_metadata.displayName);
  const supabase = await serverSupabase();

  return createSseResponse(req, (stream) => {
    const payload$ = new BehaviorSubject(initialLiveChat);
    const channelName = `topic:${receiptId}:chat`;
    const channel = supabase.channel(channelName);
    let syncSeq = 0;

    const syncChatFromDb = async () => {
      const seq = ++syncSeq;
      const nextChat = await readReceiptChat(db, receiptId, user.id);
      const nextLiveChat = toLiveChat(nextChat, user.user_metadata.displayName);

      if (seq !== syncSeq) return;
      payload$.next(nextLiveChat);
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ReceiptChat",
          filter: `receiptId=eq.${receiptId}`,
        },
        async () => {
          await syncChatFromDb();
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void syncChatFromDb();
        }
      });

    return payload$.pipe(
      distinctUntilChanged(isEqual),
      tap((payload) => {
        stream.sendData(payload);
      }),
      finalize(() => {
        void channel.unsubscribe();
      }),
    );
  });
}
