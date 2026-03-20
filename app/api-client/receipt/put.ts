import { ApiValidator } from "@/app/api-client/api-validator";
import { z } from "zod";
import { receiptWithIdsAndClaimsSchema } from "@/model/receipt/schema";

const validator = {
  request: receiptWithIdsAndClaimsSchema,
  response: z.unknown(),
} satisfies ApiValidator;

export default validator;
