import { z } from "zod";

export const receiptMetaBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .describe(
      "Short receipt name in the receipt language. Prefer venue name if identifiable; otherwise create a light, casual title based on receipt items/context, still in the receipt language.",
    ),
});
