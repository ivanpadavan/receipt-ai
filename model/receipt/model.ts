import { z } from "zod";
import {
  participantDtoSchema,
  receiptAiSchema,
  receiptSchema,
  receiptWithParticipantsSchema,
} from "./schema";
export * from "@/model/receipt/math";
import { validatePosition } from "@/model/receipt/math";

export type ReceiptModifier = z.infer<typeof receiptSchema>["fees"][number] | z.infer<typeof receiptSchema>["discounts"][number];
export type ReceiptPosition = z.infer<typeof receiptSchema>["positions"][number];
export type ReceiptPositionClaim = z.infer<typeof receiptSchema>["positions"][number]["claims"][number];
export type ReceiptMeta = z.infer<typeof receiptSchema>["meta"];
export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptWithParticipants = z.infer<typeof receiptWithParticipantsSchema>;

export type ParticipantDTO = z.infer<typeof participantDtoSchema>;

// Infer TypeScript types from Zod schema
export type ReceiptNoId = z.infer<typeof receiptAiSchema>;
export { validatePosition };
