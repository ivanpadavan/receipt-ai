import { ApiValidator } from "@/app/api-client/api-validator";
import { z } from "zod";
import { receiptSchema } from "@/model/receipt/schema";

const validator = {
  request: z.object({ id: z.string(), data: receiptSchema }),
  response: z.unknown(),
} satisfies ApiValidator;

export default validator;