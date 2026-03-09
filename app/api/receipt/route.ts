import { receiptAiSchema, receiptBusinessSchema } from "@/model/receipt/schema";
import { Receipt, ReceiptNoId } from "@/model/receipt/model";
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { db } from "@/app/db";
import postValidator from "@/app/api-client/receipt/post";
import { serverSupabase } from "@/utils/supabase/server";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { t, withLanguage } from "@/app/i18n/translations";

// Edge runtime is not compatible with Prisma, so we need to use the Node.js runtime
export const runtime = "nodejs";

const imagePrompt = ChatPromptTemplate.fromMessages([
  [
    "human",
    [
      {
        type: "text",
        text:
          "Analyze the receipt image and extract the structured data.\n" +
          "Extract all paid items, prices, quantities, and totals.\n" +
          "Items can have titles with line breaks. Don't miss data due to line break in the receipt. Carefully analyze start and end of position title.\n" +
          "Skip free giveaway or complimentary positions with zero total cost. Do not include positions whose overall is 0 in the output.\n" +
          "If a drink line is priced by liters but represents a single served item, simplify it to pieces: use quantity 1, use the line total as the item price and overall, and keep the poured volume in the name when helpful.\n" +
          "After normalization, merge identical positions into one line when they have the same normalized name and unit price. Sum their quantity and overall.\n" +
          "Identify any modifiers that increase the total (like tips, VAT, service fees) and modifiers that decrease the total (like discounts, promotions).\n" +
          "Format the data according to the specified schema and keep totals consistent with the paid positions and modifiers.",
      },
      {
        type: "image_url",
        image_url: "{image_base64}",
      },
    ],
  ],
]);

const model = new ChatOpenRouter({
  temperature: 1,
  model: process.env.OPENROUTER_API_MODEL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Create the chain
const imageChain = imagePrompt.pipe(
  model.withStructuredOutput(receiptAiSchema, {
    name: "receipt_data_extractor",
  }),
);

const fixErrorsPrompt = PromptTemplate.fromTemplate(
  `There as result of reciept parsing: {result}. There are errors: {errors}. Fix them.
Keep these extraction rules while fixing:
- skip positions with zero total cost
- if a drink is priced by liters but is a single served item, normalize it to quantity 1 and set price = overall = line total
- merge identical normalized positions by summing quantity and overall`,
);

const fixErrorsChain = fixErrorsPrompt.pipe(
  model.withStructuredOutput(receiptAiSchema, {
    name: "receipt_data_extractor",
  }),
);

function appendIdsToArr<T>(v: T[]): (T & { id: string })[] {
  return v.map((v) => ({ ...v, id: crypto.randomUUID() }));
}

function toReceipt(receipt: ReceiptNoId): Receipt {
  return {
    ...receipt,
    receiptMeta: {
      ...receipt.receiptMeta,
      // TODO use cookie for proper language
      title: receipt.receiptMeta.title || t("receipt"),
      currencySymbol: receipt.receiptMeta.currencySymbol || "₽",
    },
    positions: appendIdsToArr(receipt.positions).map((v) => ({
      ...v,
      claims: [],
    })),
    fees: appendIdsToArr(receipt.fees),
    discounts: appendIdsToArr(receipt.discounts),
  };
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
 * This handler initializes and calls an OpenRouter powered
 * structured output chain for receipt processing.
 */
export async function POST(req: NextRequest) {
  return withLanguage("en", () =>
    errorWrap(req, postValidator, async ({ session, body }) => {
      const userId = session.user.id;

      // FIXME violates smth
      const imageUrl = await uploadImage(body.image, userId);

      // Process the image
      let result = await imageChain.invoke({ image_base64: body.image });

      let i = 0;
      while (i < 3) {
        const validation = receiptBusinessSchema.safeParse(result);
        if (!validation.success) {
          result = await fixErrorsChain.invoke({
            result,
            errors: validation.error,
          });
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
          data: toReceipt(result), // Store the receipt data as JSON
        },
      });

      // Return the receipt ID instead of the full data
      return NextResponse.json(
        {
          id: receipt.id,
        },
        { status: 200 },
      );
    }),
  );
}
