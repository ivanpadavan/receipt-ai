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

export const receiptChatToolEventSchema = z.object({
  type: z.literal("requested_receipt_images"),
  imageCount: z.number().int().nonnegative(),
});

const receiptChatResponseMetadataSchema = z.object({
  events: z.array(receiptChatToolEventSchema).default([]),
});

export const receiptChatQuestionResponseSchema = receiptChatResponseMetadataSchema.extend({
  type: z.literal("question"),
  message: z.string().min(1),
});

export const receiptChatStructuralPreviewResponseSchema = receiptChatResponseMetadataSchema.extend({
  type: z.literal("structural_preview"),
  receipt: receiptStructuralPreviewSchema,
});

const receiptChatClaimSchema = z.object({
  id: z.string(),
  participantIds: z.array(z.string()),
  type: z.enum(["quantity", "amount"]),
  value: z.number(),
});

export const receiptChatClaimsPreviewResponseSchema = receiptChatResponseMetadataSchema.extend({
  type: z.literal("claims_preview"),
  receipt: receiptSchema,
  positionClaims: z.record(z.array(receiptChatClaimSchema)),
});

export const receiptChatResponseSchema = z.discriminatedUnion("type", [
  receiptChatQuestionResponseSchema,
  receiptChatStructuralPreviewResponseSchema,
  receiptChatClaimsPreviewResponseSchema,
]);

export const receiptChatClaimsPreviewModelResponseSchema = z
  .object({
    type: z.literal("claims_preview"),
    positionClaims: z.record(z.array(receiptChatClaimSchema)),
    events: z.array(receiptChatToolEventSchema).default([]),
  });

export const receiptChatModelResponseSchema = z.discriminatedUnion("type", [
  receiptChatQuestionResponseSchema,
  receiptChatResponseMetadataSchema.extend({
    type: z.literal("structural_preview"),
    receipt: receiptStructuralPreviewSchema,
  }),
  receiptChatClaimsPreviewModelResponseSchema,
]);

export const receiptChatModelResponseSchemas = [
  receiptChatQuestionResponseSchema,
  receiptChatResponseMetadataSchema.extend({
    type: z.literal("structural_preview"),
    receipt: receiptStructuralPreviewSchema,
  }),
  receiptChatClaimsPreviewModelResponseSchema,
] as const;

export type ReceiptChatRequest = z.infer<typeof receiptChatRequestSchema>;
export type ReceiptChatResponse = z.infer<typeof receiptChatResponseSchema>;
export type ReceiptChatToolEvent = z.infer<typeof receiptChatToolEventSchema>;
