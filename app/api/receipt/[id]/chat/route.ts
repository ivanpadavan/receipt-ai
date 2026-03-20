import { NextRequest, NextResponse } from "next/server";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage } from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import { inspect } from "node:util";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import validator from "@/app/api/receipt/[id]/chat/validator";
import { db } from "@/app/db";
import {
  receiptChatModelResponseSchema,
  receiptChatModelResponseSchemas,
  receiptChatResponseSchema,
  type ReceiptChatResponse,
  type ReceiptChatToolEvent,
} from "@/model/receipt/schema-chat";
import { withLanguage } from "@/app/i18n/translations";
import { buildParticipants } from "@/app/db-utils/build-participants";
import type { Receipt } from "@/model/receipt/model";

export const runtime = "nodejs";

const model = new ChatOpenRouter({
  temperature: 0.2,
  model: process.env.OPENROUTER_API_MODEL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

function formatHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
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

async function generateReceiptChatResponse({
  receiptId,
  receipt,
  imageUrls,
  participants,
  currentUserParticipantId,
  currentUserDisplayName,
  history,
  message,
}: {
  receiptId: string;
  receipt: Receipt;
  imageUrls: string[];
  participants: Array<{ id: string; displayName: string }>;
  currentUserParticipantId: string | null;
  currentUserDisplayName: string | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
}) {
  const events: ReceiptChatToolEvent[] = [];

  const getReceiptImages = tool(
    async () => {
      const signedImageUrls = await createReceiptImageUrls(imageUrls);
      const event: ReceiptChatToolEvent = {
        type: "requested_receipt_images",
        imageCount: signedImageUrls.length,
      };

      events.push(event);
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

  const prompt =
    "You are helping the user edit a receipt through chat.\n" +
    "Return exactly one structured response.\n" +
    "Allowed response types:\n" +
    '- `question`: when clarification is required before making a preview. `message` must be plain text only.\n' +
    '- `structural_preview`: when you are proposing a changed receipt structure. Return the full structural preview without claims. Existing rows and modifiers must carry their current `id`; new rows and modifiers omit `id`.\n' +
    '- `claims_preview`: when you are proposing how claims should be filled. Return claims only as `positionClaims: Record<string, claim[]>` keyed by existing `positionId`.\n' +
    "You may call `get_receipt_images` if the original photos are needed.\n" +
    "For `question`, use only plain text with optional newline characters.\n" +
    "For `question`, do not use markdown, bullet lists, numbered lists, or JSON.\n" +
    "For `question`, keep the answer short and direct.\n" +
    "If the user asks for a count or a single fact, answer with that fact in the first sentence.\n" +
    "Keep unchanged fields from the current receipt when generating previews.\n" +
    "For claims preview, do not return full positions, fees, discounts, totals, or metadata.\n" +
    "For claims preview, reference existing positions by `id` and participants by `id`.\n" +
    "Use the provided participants list with display names when resolving who the user means.\n\n" +
    `Current user context:\n${JSON.stringify(
      {
        currentUserParticipantId,
        currentUserDisplayName,
      },
      null,
      2,
    )}\n\n` +
    `Current receipt JSON:\n${JSON.stringify(receipt, null, 2)}\n\n` +
    `Participants JSON:\n${JSON.stringify(participants, null, 2)}\n\n` +
    `Chat history:\n${formatHistory(history)}\n\n` +
    `Latest user message:\n${message}`;

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

  const structuredResponse = receiptChatModelResponseSchema.parse(
    result.structuredResponse,
  );

  return {
    ...structuredResponse,
    events: [...events, ...structuredResponse.events],
  };
}

function toApiResponse(
  receipt: Receipt,
  response: Awaited<ReturnType<typeof generateReceiptChatResponse>>,
): ReceiptChatResponse {
  if (response.type !== "claims_preview") {
    return receiptChatResponseSchema.parse(response);
  }

  return receiptChatResponseSchema.parse({
    type: "claims_preview",
    receipt: {
      ...receipt,
      positions: receipt.positions.map((position) => ({
        ...position,
        claims: response.positionClaims[position.id] ?? position.claims,
      })),
    },
    positionClaims: response.positionClaims,
    events: response.events,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;

  return withLanguage("en", () =>
    errorWrap(req, validator, async ({ session, body }) => {
      const receipt = await db.receipt.findUnique({
        where: { id: receiptId },
        select: { data: true, imageUrls: true },
      });

      if (!receipt) {
        throw Object.assign(new Error("Receipt not found"), { status: 404 });
      }

      const participants = await buildParticipants(receiptId);
      const currentUserParticipant = participants.find(
        (participant) => participant.id === session.user.id,
      );
      const currentUserDisplayName =
        currentUserParticipant?.displayName ??
        (typeof session.user.user_metadata?.displayName === "string"
          ? session.user.user_metadata.displayName
          : null);
      const response = await generateReceiptChatResponse({
        receiptId,
        receipt: receipt.data as Receipt,
        imageUrls: receipt.imageUrls,
        participants: participants.map((participant) => ({
          id: participant.id,
          displayName: participant.displayName,
        })),
        currentUserParticipantId: currentUserParticipant?.id ?? null,
        currentUserDisplayName,
        history: body.history,
        message: body.message,
      });

      return NextResponse.json(
        validator.response.parse(toApiResponse(receipt.data as Receipt, response)),
      );
    }),
  );
}
