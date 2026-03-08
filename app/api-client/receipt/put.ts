import { ApiValidator } from "@/app/api-client/api-validator";
import { z } from "zod";
import { receiptWithIdsSchema } from "@/model/receipt/schema";

const validator = {
  request: receiptWithIdsSchema,
  response: z.unknown(),
} satisfies ApiValidator;

export default validator;
