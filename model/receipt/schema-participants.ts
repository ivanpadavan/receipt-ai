import { z } from "zod";
import { receiptSchema } from "@/model/receipt/schema-form";

export const participantDtoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  color: z.string(),
  kind: z.enum(["REAL", "MOCK"]),
  avatarUrl: z.string().optional(),
  isOnline: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
});

export const receiptWithParticipantsSchema = z.object({
  receipt: receiptSchema,
  participants: z.array(participantDtoSchema),
});
