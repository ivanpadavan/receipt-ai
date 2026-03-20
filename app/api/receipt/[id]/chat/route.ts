import { NextRequest, NextResponse } from "next/server";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage } from "@langchain/core/messages";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import validator from "@/app/api/receipt/[id]/chat/validator";
import { db } from "@/app/db";
import {
  receiptChatModelResponseSchema,
  receiptChatResponseSchema,
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

const receiptChatModel = model.withStructuredOutput(receiptChatModelResponseSchema, {
  name: "receipt_chat_response",
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

async function generateReceiptChatResponse({
  receipt,
  participants,
  history,
  message,
}: {
  receipt: Receipt;
  participants: Array<{ id: string; displayName: string }>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
}) {
  const prompt =
    "You are helping the user edit a receipt through chat.\n" +
    "Return exactly one structured response.\n" +
    "Allowed response types:\n" +
    '- `question`: when clarification is required before making a preview.\n' +
    '- `structural_preview`: when you are proposing a changed receipt structure. Return the full structural preview without ids or claims.\n' +
    '- `claims_preview`: when you are proposing how claims should be filled. Return only changed positions as `{ id, claims }`.\n' +
    "Keep unchanged fields from the current receipt when generating previews.\n" +
    "For claims preview, do not return full positions, fees, discounts, totals, or metadata.\n" +
    "For claims preview, reference existing positions by `id` and participants by `id`.\n" +
    "Use the provided participants list with display names when resolving who the user means.\n\n" +
    `Current receipt JSON:\n${JSON.stringify(receipt, null, 2)}\n\n` +
    `Participants JSON:\n${JSON.stringify(participants, null, 2)}\n\n` +
    `Chat history:\n${formatHistory(history)}\n\n` +
    `Latest user message:\n${message}`;

  return receiptChatModel.invoke([
    new HumanMessage({
      content: prompt,
    }),
  ]);
}

function toApiResponse(
  receipt: Receipt,
  response: Awaited<ReturnType<typeof generateReceiptChatResponse>>,
) {
  if (response.type !== "claims_preview") {
    return response;
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
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;

  return withLanguage("en", () =>
    errorWrap(req, validator, async ({ body }) => {
      const receipt = await db.receipt.findUnique({
        where: { id: receiptId },
        select: { data: true },
      });

      if (!receipt) {
        throw Object.assign(new Error("Receipt not found"), { status: 404 });
      }

      const participants = await buildParticipants(receiptId);
      const response = await generateReceiptChatResponse({
        receipt: receipt.data as Receipt,
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
