import { NextRequest, NextResponse } from "next/server";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage } from "@langchain/core/messages";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import validator from "@/app/api/receipt/[id]/chat/validator";
import { db } from "@/app/db";
import { receiptChatResponseSchema } from "@/model/receipt/schema-chat";
import { withLanguage } from "@/app/i18n/translations";

export const runtime = "nodejs";

const model = new ChatOpenRouter({
  temperature: 0.2,
  model: process.env.OPENROUTER_API_MODEL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

const receiptChatModel = model.withStructuredOutput(receiptChatResponseSchema, {
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
  history,
  message,
}: {
  receipt: unknown;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
}) {
  const prompt =
    "You are helping the user edit a receipt through chat.\n" +
    "Return exactly one structured response.\n" +
    "Allowed response types:\n" +
    '- `question`: when clarification is required before making a preview.\n' +
    '- `structural_preview`: when you are proposing a changed receipt structure. Return the full structural preview without ids or claims.\n' +
    '- `claims_preview`: when you are proposing how claims should be filled. Return the full receipt snapshot including ids and claims.\n' +
    "Keep unchanged fields from the current receipt when generating previews.\n" +
    "Do not remove ids from claims preview.\n\n" +
    `Current receipt JSON:\n${JSON.stringify(receipt, null, 2)}\n\n` +
    `Chat history:\n${formatHistory(history)}\n\n` +
    `Latest user message:\n${message}`;

  return receiptChatModel.invoke([
    new HumanMessage({
      content: prompt,
    }),
  ]);
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

      const response = await generateReceiptChatResponse({
        receipt: receipt.data,
        history: body.history,
        message: body.message,
      });

      return NextResponse.json(validator.response.parse(response));
    }),
  );
}
