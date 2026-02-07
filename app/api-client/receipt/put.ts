import { ApiValidator } from "@/app/api-client/api-validator";
import { z } from "zod";
import { receiptSchema } from "@/model/receipt/schema";

const validator = {
  request: receiptSchema,
  response: z.unknown(),
} satisfies ApiValidator;

export default validator;
