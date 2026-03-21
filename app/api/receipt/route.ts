import { receiptAiSchema } from "@/model/receipt/schema";
import { Receipt, ReceiptNoId } from "@/model/receipt/model";
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenRouter } from "@langchain/openrouter";
import { db } from "@/app/db";
import postValidator from "@/app/api-client/receipt/post";
import { serverSupabase } from "@/utils/supabase/server";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { t, withLanguage } from "@/app/i18n/translations";
import { HumanMessage } from "@langchain/core/messages";
import {
  buildRepairContext,
  createBusinessRepairChain,
  repairWithBusinessValidation,
} from "@/app/api/receipt/business-repair-chain";
import { receiptImageInstructions } from "@/app/api/receipt/prompts";

// Edge runtime is not compatible with Prisma, so we need to use the Node.js runtime
export const runtime = "nodejs";

const model = new ChatOpenRouter({
  temperature: 1,
  model: process.env.OPENROUTER_API_MODEL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

const imageExtractor = model.withStructuredOutput(receiptAiSchema, {
  name: "receipt_data_extractor",
});

const fixErrorsChain = createBusinessRepairChain(model, {
  schema: receiptAiSchema,
  name: "receipt_data_extractor",
  instructions:
    "Keep these extraction rules while fixing:\n" +
    "- skip positions with zero total cost\n" +
    "- if a drink is priced by liters but is a single served item, normalize it to quantity 1 and set price = overall = line total\n" +
    "- merge identical normalized positions by summing quantity and overall",
});

function appendIdsToArr<T>(v: T[]): (T & { id: string })[] {
  return v.map((v) => ({ ...v, id: crypto.randomUUID() }));
}

function toReceipt(receipt: ReceiptNoId): Receipt {
  return {
    ...receipt,
    meta: {
      ...receipt.meta,
      // TODO use cookie for proper language
      title: receipt.meta.title || t("receipt"),
      currencySymbol: receipt.meta.currencySymbol || "₽",
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

async function analyzeImages(images: string[]) {
  return imageExtractor.invoke([
    new HumanMessage({
      content: [
        {
          type: "text",
          text: receiptImageInstructions,
        },
        ...images.map((image) => ({
          type: "image_url" as const,
          image_url: image,
        })),
      ],
    }),
  ]);
}

/**
 * This handler initializes and calls an OpenRouter powered
 * structured output chain for receipt processing.
 */
export async function POST(req: NextRequest) {
  return withLanguage("en", () =>
    errorWrap(req, postValidator, async ({ session, body }) => {
      const userId = session.user.id;

      const imageUrls = await Promise.all(
        body.images.map((image: string) => uploadImage(image, userId)),
      );

      // Process the image
      const result = await repairWithBusinessValidation({
        result: await analyzeImages(body.images),
        getReceipt: (value) => value,
        setReceipt: (_value, receipt) => receipt,
        repairChain: fixErrorsChain,
        parseRepaired: (value) => receiptAiSchema.parse(value),
        repairContext: buildRepairContext([
          {
            title: "Original extraction instructions",
            content: receiptImageInstructions,
          },
        ]),
        telemetry: {
          label: "receipt_parse",
        },
      });

      // Save the receipt to the database
      const receipt = await db.receipt.create({
        data: {
          userId,
          imageUrls,
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
