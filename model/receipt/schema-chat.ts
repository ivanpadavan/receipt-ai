import { z } from "zod";
import { receiptSchema } from "@/model/receipt/schema-form";
import { receiptStructuralPreviewSchema } from "@/model/receipt/schema-structural";

export const receiptChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const receiptChatRequestSchema = z.object({
  message: z.string().min(1),
  history: z.array(receiptChatMessageSchema).default([]),
});

export const receiptChatQuestionResponseSchema = z.object({
  type: z.literal("question"),
  message: z.string().min(1),
});

export const receiptChatStructuralPreviewResponseSchema = z.object({
  type: z.literal("structural_preview"),
  receipt: receiptStructuralPreviewSchema,
});

export const receiptChatClaimsPreviewResponseSchema = z.object({
  type: z.literal("claims_preview"),
  receipt: receiptSchema,
});

export const receiptChatResponseSchema = z.discriminatedUnion("type", [
  receiptChatQuestionResponseSchema,
  receiptChatStructuralPreviewResponseSchema,
  receiptChatClaimsPreviewResponseSchema,
]);

const receiptChatClaimSchema = z.object({
  id: z.string(),
  participantIds: z.array(z.string()),
  type: z.enum(["quantity", "amount"]),
  value: z.number(),
});

export const receiptChatClaimsPreviewModelResponseSchema = z.object({
  type: z.literal("claims_preview"),
  positions: z.array(
    z.object({
      id: z.string(),
      claims: z.array(receiptChatClaimSchema),
    }),
  ),
});

export const receiptChatModelResponseSchema = z.discriminatedUnion("type", [
  receiptChatQuestionResponseSchema,
  receiptChatStructuralPreviewResponseSchema,
  receiptChatClaimsPreviewModelResponseSchema,
]);

export type ReceiptChatRequest = z.infer<typeof receiptChatRequestSchema>;
export type ReceiptChatResponse = z.infer<typeof receiptChatResponseSchema>;
