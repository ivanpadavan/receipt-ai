import { z } from "zod";
import { receiptSchema } from "@/model/receipt/schema-form";
import {
  receiptStructuralPreviewSchema,
  receiptWithIdsSchema,
} from "@/model/receipt/schema-structural";

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
  receipt: receiptWithIdsSchema,
});

const receiptChatClaimSchema = z.object({
  participantIds: z.array(z.string()).describe(
    "Participant ids that should own this claim. Every id in this array must come from the provided participants list. Use the current user participant id when the user refers to themselves.",
  ),
  type: z.enum(["quantity", "amount"]).describe(
    "How the claim value should be interpreted. Use `quantity` when splitting item units, pieces, drinks, or fractional item quantities. Use `amount` when assigning a money amount directly.",
  ),
  value: z.number().describe(
    "Numeric claim value for the selected type. For `quantity`, this is the claimed unit count or fractional quantity for that position. For `amount`, this is the claimed money amount in receipt currency, not a percentage.",
  ),
}).describe(
  "One proposed claim for a single existing receipt position.",
);

const receiptChatPositionClaimsSchema = z.record(
  z.array(receiptChatClaimSchema),
).describe(
  "Map of existing receipt position ids to proposed claims. Every key must be an existing `position.id` from the current receipt. Do not invent new position ids. Omit positions that should stay unchanged.",
);

export const receiptChatClaimsPreviewResponseSchema = receiptChatResponseMetadataSchema.extend({
  type: z.literal("claims_preview"),
  positionClaims: receiptChatPositionClaimsSchema,
}).describe(
  "Claims preview returned to the client. `receipt` is the fully materialized preview used for rendering, while `positionClaims` is the canonical AI proposal keyed by existing receipt position ids.",
);

export const receiptChatResponseSchema = z.discriminatedUnion("type", [
  receiptChatQuestionResponseSchema,
  receiptChatStructuralPreviewResponseSchema,
  receiptChatClaimsPreviewResponseSchema,
]);

export const receiptChatQuestionModelResponseSchema = z.object({
  type: z.literal("question"),
  message: z.string().min(1),
});

export const receiptChatStructuralPreviewModelResponseSchema = z.object({
  type: z.literal("structural_preview"),
  receipt: receiptStructuralPreviewSchema,
});

export const receiptChatClaimsPreviewModelResponseSchema = z.object({
  type: z.literal("claims_preview"),
  positionClaims: receiptChatPositionClaimsSchema,
}).describe(
  "Canonical claims-only response for the model. Return only `positionClaims`, keyed by existing `position.id`. Do not return receipt structure here. Use an empty object only when no claims can be proposed from the user's request.",
);

export const receiptChatModelResponseSchema = z.discriminatedUnion("type", [
  receiptChatQuestionModelResponseSchema,
  receiptChatStructuralPreviewModelResponseSchema,
  receiptChatClaimsPreviewModelResponseSchema,
]);

export const receiptChatModelResponseSchemas = [
  receiptChatQuestionModelResponseSchema,
  receiptChatStructuralPreviewModelResponseSchema,
  receiptChatClaimsPreviewModelResponseSchema,
] as const;

export type ReceiptChatRequest = z.infer<typeof receiptChatRequestSchema>;
export type ReceiptChatResponse = z.infer<typeof receiptChatResponseSchema>;
export type ReceiptChatToolEvent = z.infer<typeof receiptChatToolEventSchema>;
