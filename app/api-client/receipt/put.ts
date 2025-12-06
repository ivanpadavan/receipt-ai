import { ApiValidator } from "@/app/api-client/api-validator";
import { z } from "zod";
import { recieptSchema } from "@/model/receipt/schema";

const validator = {
  request: z.object({ id: z.string(), data: recieptSchema }),
  response: z.unknown(),
} satisfies ApiValidator;

export default validator;