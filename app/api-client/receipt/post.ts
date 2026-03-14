import { ApiValidator } from "@/app/api-client/api-validator";
import { z } from "zod";

const validator = {
  request: z.object({
    images: z.array(z.string()).min(1),
  }),
  response: z.object({
    id: z.string(),
  }),
} satisfies ApiValidator;

export default validator;
