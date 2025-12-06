import { recieptSchema } from "@/model/receipt/schema";
import { Receipt, validateReceipt } from "@/model/receipt/model";
import { auth } from "@/app/auth";
import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { db } from "@/app/db";
import { Session } from "next-auth";
import postValidator from "@/app/api-client/receipt/post";
import putValidator from "@/app/api-client/receipt/put";
import { ApiValidator } from "@/app/api-client/api-validator";

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
  model: process.env.GOOGLE_API_MODEL!,
  apiKey: process.env.GOOGLE_API_KEY, // Using the Google API key
});

// Create the chain
const imageChain = imagePrompt.pipe(
  model.withStructuredOutput(recieptSchema, { name: "receipt_data_extractor" })
);

const fixErrorsPrompt = PromptTemplate.fromTemplate(`There as result of reciept parsing: {result}. There are errors: {errors}. Fix them`);

const fixErrorsChain = fixErrorsPrompt.pipe(
  model.withStructuredOutput(recieptSchema, { name: "receipt_data_extractor" })
);

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
  } catch (e: any) {
    console.error("API Error:", e);
    return NextResponse.json(
      { error: e.message },
      { status: e.status ?? 500 },
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
    let result: Receipt = await imageChain.invoke({ image_base64: body.image });

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

    // Save the receipt to the database
    const receipt = await db.receipt.create({
      data: {
        userId,
        data: result as Receipt, // Store the receipt data as JSON
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