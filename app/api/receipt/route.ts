import { receiptAiSchema } from "@/model/receipt/schema";
import { Receipt, ReceiptNoId, validateReceipt } from "@/model/receipt/model";
import { auth } from "@/app/auth";
import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { db } from "@/app/db";
import { Session } from "next-auth";
import postValidator from "@/app/api-client/receipt/post";
import putValidator from "@/app/api-client/receipt/put";
import { ApiValidator } from "@/app/api-client/api-validator";
import { supabase, supabaseAdmin } from "@/app/supabase";

// Edge runtime is not compatible with Prisma, so we need to use the Node.js runtime
export const runtime = "nodejs";

const imagePrompt = ChatPromptTemplate.fromMessages([
  [
    "human",
    [
      {
        type: "text",
        text: "Analyze the receipt image and extract the structured data.\nExtract all items, prices, quantities, and totals.\nItems can have titles with line breaks. Don't miss data due to line break in the receipt. Carefully analyze start and end of position title.\nIdentify any modifiers that increase the total (like tips, VAT, service fees) and modifiers that decrease the total (like discounts, promotions).\nFormat the data according to the specified schema.",
      },
      {
        type: "image_url",
        image_url: "{image_base64}",
      },
    ],
  ],
]);

// Using Google's Gemini model for image analysis
const model = new ChatGoogleGenerativeAI({
  temperature: 1,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  model: process.env.GOOGLE_API_MODEL!,
  apiKey: process.env.GOOGLE_API_KEY, // Using the Google API key
});

// Create the chain
const imageChain = imagePrompt.pipe(
  model.withStructuredOutput(receiptAiSchema, { name: "receipt_data_extractor" })
);

const fixErrorsPrompt = PromptTemplate.fromTemplate(`There as result of reciept parsing: {result}. There are errors: {errors}. Fix them`);

const fixErrorsChain = fixErrorsPrompt.pipe(
  model.withStructuredOutput(receiptAiSchema, { name: "receipt_data_extractor" })
);

function appendIdsToArr<T>(v: T[]): (T & { id: string })[] {
  return v.map((v) => ({ ...v, id: crypto.randomUUID() }));
}

function appendIds(receipt: ReceiptNoId): Receipt {
  return {
    ...receipt,
    positions: appendIdsToArr(receipt.positions),
    fees: appendIdsToArr(receipt.fees),
    discounts: appendIdsToArr(receipt.discounts),
  }
}

async function errorWrap<T extends ApiValidator>(req: NextRequest, validator: T, cb: (v: { session: Session, body: ReturnType<T['request']['parse']> }) => Promise<NextResponse<ReturnType<T['response']['parse']>>>) {
  try {
    // Get the user's session
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = validator.request.parse(await req.json()) as ReturnType<T['request']['parse']>;

    return cb({ session, body });
  } catch (e: unknown) {
    console.error("API Error:", e);
    if (typeof e !== 'object' || e == null) {
      return NextResponse.json(
        { error: 'unknown' },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: 'message' in e && e.message },
      { status: 'status' in e && typeof e.status === 'number' ? e.status : 500 },
    );
  }
}

/**
 * This handler initializes and calls a Google Gemini powered
 * structured output chain for receipt processing.
 */
export async function POST(req: NextRequest) {
  return errorWrap(req, postValidator, async ({ session, body }) => {
    const userId = session.user.id;

    // Process the image
    let result = await imageChain.invoke({ image_base64: body.image });

    let i = 0;
    while (i < 3) {
      const { isValid, errors } = validateReceipt(result);
      if (!isValid) {
        result = await fixErrorsChain.invoke({ result, errors });
        i++;
      } else {
        break;
      }
    }

    appendIds(result);

    const match = body.image.match(/^data:(image\/\w+);base64,/);
    const mimeType = match ? match[1] : "image/jpeg";
    const extension = mimeType.split("/")[1] || "jpg";

    const base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabaseAdmin.storage
      .from("receipts")
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error("Supabase storage upload error:", error);
    }
    const imageUrl = data.fullPath;
    // Save the receipt to the database
    const receipt = await db.receipt.create({
      data: {
        userId,
        imageUrl,
        data: result, // Store the receipt data as JSON
      },
    });

    // Return the receipt ID instead of the full data
    return NextResponse.json({
      id: receipt.id,
    }, { status: 200 });
  });
}

/**
 * FIXME ability to change only for users that visited
 */
export async function PUT(req: NextRequest) {
  return errorWrap(req, putValidator, async ({ body }) => {
    await db.receipt.update({ where: { id: body.id }, data: { data: body.data } });
    return NextResponse.json({ success: true }, { status: 200 });
  })
}