import { NextRequest, NextResponse } from "next/server";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage } from "@langchain/core/messages";
import { createAgent, tool, toolStrategy } from "langchain";
import { z } from "zod";
import type { ApiValidator } from "@/app/api-client/api-validator";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import validator from "@/app/api/receipt/[id]/chat/validator";
import { db } from "@/app/db";
import {
  receiptChatModelResponseSchema,
  receiptChatResponseSchema,
  type ReceiptChatResponse,
  type ReceiptChatToolEvent,
} from "@/model/receipt/schema-chat";
import { withLanguage } from "@/app/i18n/translations";
import { buildParticipants } from "@/app/db-utils/build-participants";
import { serverSupabase } from "@/utils/supabase/server";
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

  const supabase = await serverSupabase();
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrls(imageUrls, 600);

  if (error) {
    throw new Error(`Supabase storage signed URL error: ${error.message}`);
  }

  return data
    .map((item) => item.signedUrl)
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}

async function generateReceiptChatResponse({
  receiptId,
  receipt,
  imageUrls,
  participants,
  history,
  message,
}: {
  receiptId: string;
  receipt: Receipt;
  imageUrls: string[];
  participants: Array<{ id: string; displayName: string }>;
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
        "Get original receipt photos as signed URLs when the text context is not enough.",
      schema: z.object({}),
    },
  );

  const prompt =
    "You are helping the user edit a receipt through chat.\n" +
    "Return exactly one structured response.\n" +
    "Allowed response types:\n" +
    '- `question`: when clarification is required before making a preview.\n' +
    '- `structural_preview`: when you are proposing a changed receipt structure. Return the full structural preview without ids or claims.\n' +
    '- `claims_preview`: when you are proposing how claims should be filled. Return only changed positions as `{ id, claims }`.\n' +
    "You may call `get_receipt_images` if the original photos are needed.\n" +
    "Keep unchanged fields from the current receipt when generating previews.\n" +
    "For claims preview, do not return full positions, fees, discounts, totals, or metadata.\n" +
    "For claims preview, reference existing positions by `id` and participants by `id`.\n" +
    "Use the provided participants list with display names when resolving who the user means.\n\n" +
    `Current receipt JSON:\n${JSON.stringify(receipt, null, 2)}\n\n` +
    `Participants JSON:\n${JSON.stringify(participants, null, 2)}\n\n` +
    `Chat history:\n${formatHistory(history)}\n\n` +
    `Latest user message:\n${message}`;

  const agent = createAgent({
    model,
    tools: [getReceiptImages],
    responseFormat: toolStrategy(receiptChatModelResponseSchema),
    systemPrompt:
      "Help the user edit the receipt. Use tools when needed, then produce the final structured response.",
  });

  const result = await agent.invoke({
    messages: [new HumanMessage(prompt)],
  });

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

  const claimsByPositionId = new Map(
    response.positions.map((position) => [position.id, position.claims]),
  );

  return receiptChatResponseSchema.parse({
    type: "claims_preview",
    receipt: {
      ...receipt,
      positions: receipt.positions.map((position) => ({
        ...position,
        claims: claimsByPositionId.get(position.id) ?? position.claims,
      })),
    },
    events: response.events,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;

  return withLanguage("en", () =>
    errorWrap(req, validator as unknown as ApiValidator, async ({ body }) => {
      const receipt = await db.receipt.findUnique({
        where: { id: receiptId },
        select: { data: true, imageUrls: true },
      });

      if (!receipt) {
        throw Object.assign(new Error("Receipt not found"), { status: 404 });
      }

      const participants = await buildParticipants(receiptId);
      const response = await generateReceiptChatResponse({
        receiptId,
        receipt: receipt.data as Receipt,
        imageUrls: receipt.imageUrls,
        participants: participants.map((participant) => ({
          id: participant.id,
          displayName: participant.displayName,
        })),
        history: body.history,
        message: body.message,
      });

      return NextResponse.json(
        validator.response.parse(toApiResponse(receipt.data as Receipt, response)),
      );
    }),
  );
}
