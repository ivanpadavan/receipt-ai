import { receiptAiSchema } from "@/model/receipt/schema";
import { Receipt, ReceiptNoId, validateReceipt } from "@/model/receipt/model";
import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { db } from "@/app/db";
import postValidator from "@/app/api-client/receipt/post";
import { serverSupabase } from "@/utils/supabase/server";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { getNextColor } from "@/app/receipt/utils/participants";

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

function appendIdsAndUser(receipt: ReceiptNoId): Receipt {
  return {
    ...receipt,
    positions: appendIdsToArr(receipt.positions).map((v) => ({ ...v, claims: [] })),
    fees: appendIdsToArr(receipt.fees),
    discounts: appendIdsToArr(receipt.discounts),
  }
}

async function uploadImage(image: string, userId: string) {
  const match = image.match(/^data:(image\/\w+);base64,/);
  const mimeType = match ? match[1] : "image/jpeg";
  const extension = mimeType.split("/")[1] || "jpg";
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const fileName = `${userId}/${crypto.randomUUID()}.${extension}`;

  const supabase = await serverSupabase();
  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase storage upload error: ${error.message}`);
  }
  return data.fullPath;
}

/**
 * This handler initializes and calls a Google Gemini powered
 * structured output chain for receipt processing.
 */
export async function POST(req: NextRequest) {
  return errorWrap(req, postValidator, async ({ session, body }) => {
    const userId = session.user.id;

    // FIXME violates smth
    const imageUrl = await uploadImage(body.image, userId);

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

    // Save the receipt to the database
    const receipt = await db.receipt.create({
      data: {
        userId,
        imageUrl,
        data: appendIdsAndUser(result), // Store the receipt data as JSON
      },
    });

    const displayName =
      (session.user.user_metadata?.displayName as string | undefined)?.trim() ||
      session.user.email?.split("@")[0] ||
      "Anonymous";
    if (displayName && displayName !== "Anonymous") {
      await db.receiptUserParticipant.create({
        data: {
          receiptId: receipt.id,
          userId,
          color: getNextColor([]),
        },
      });
    }

    // Return the receipt ID instead of the full data
    return NextResponse.json(
      {
        id: receipt.id,
      },
      { status: 200 },
    );
  });
}
