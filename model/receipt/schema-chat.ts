import { z } from "zod";
import {
  receiptStructuralPreviewSchema,
  positionAiSchema,
  receiptWithIdsSchema,
} from "@/model/receipt/schema-structural";
import { receiptWithIdsAndClaimsSchema } from "@/model/receipt/schema-form";

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

const receiptChatClaimModelSchema = z.object({
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
  "One proposed claim for a single existing receipt position. The model does not need to include claim ids.",
);

const receiptChatPositionWithClaimsModelSchema = positionAiSchema.extend({
  id: z.string().describe(
    "Existing position id from the current receipt. Keep the same id for matching positions.",
  ),
  claims: z.array(receiptChatClaimModelSchema).describe(
    "Claims for this existing position. Only claims may differ from the original receipt position.",
  ),
}).describe(
  "A receipt position with attached claims for claims_preview model output.",
);

const receiptChatPositionClaimsSchema = z.record(
  z.array(receiptChatClaimSchema),
).describe(
  "Map of existing receipt position ids to proposed claims. Every key must be an existing `position.id` from the current receipt. Do not invent new position ids. Omit positions that should stay unchanged.",
);

export const receiptChatClaimsPreviewResponseSchema = receiptChatResponseMetadataSchema.extend({
  type: z.literal("claims_preview"),
  receiptSnapshot: receiptWithIdsAndClaimsSchema,
  positionClaims: receiptChatPositionClaimsSchema,
}).describe(
  "Claims preview returned to the client. The client receives the live receipt snapshot plus only `positionClaims` keyed by existing receipt position ids and builds the preview from the snapshot.",
);

export const receiptChatResponseSchema = z.discriminatedUnion("type", [
  receiptChatQuestionResponseSchema,
  receiptChatStructuralPreviewResponseSchema,
  receiptChatClaimsPreviewResponseSchema,
]);

export const receiptChatUserHistoryEntrySchema = z.object({
  id: z.string(),
  role: z.literal("user"),
  participantId: z.string(),
  content: z.string().min(1),
});

export const receiptChatAssistantHistoryEntrySchema = z.object({
  id: z.string(),
  role: z.literal("assistant"),
  response: receiptChatResponseSchema,
});

export const receiptChatHistoryEntrySchema = z.discriminatedUnion("role", [
  receiptChatUserHistoryEntrySchema,
  receiptChatAssistantHistoryEntrySchema,
]);

export const receiptChatHistorySchema = z.array(receiptChatHistoryEntrySchema);

export const receiptChatPersistedSchema = z.object({
  history: receiptChatHistorySchema.default([]),
  pending: z.boolean().default(false),
});

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
  positions: z.array(receiptChatPositionWithClaimsModelSchema).describe(
    "Positions from the current receipt with claims attached. The model must return the full positions array, in the same order and with the same ids as the original receipt. Only claims may differ.",
  ),
}).describe(
  "Canonical claims preview response for the model. Return only positions, not the full receipt. Keep the same positions, ids, order, and item fields as the original receipt. Only claims may differ.",
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

export type ReceiptChatHistoryEntry = z.infer<typeof receiptChatHistoryEntrySchema>;
export type ReceiptChatHistory = z.infer<typeof receiptChatHistorySchema>;
export type ReceiptChatPersisted = z.infer<typeof receiptChatPersistedSchema>;
export type ReceiptChatRequest = z.infer<typeof receiptChatRequestSchema>;
export type ReceiptChatResponse = z.infer<typeof receiptChatResponseSchema>;
export type ReceiptChatToolEvent = z.infer<typeof receiptChatToolEventSchema>;
