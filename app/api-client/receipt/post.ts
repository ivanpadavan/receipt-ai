import { ApiValidator } from "@/app/api-client/api-validator";
import { z } from "zod";

const validator = {
  request: z.object({
    image: z.string(),
  }),
  response: z.object({
    id: z.string(),
  }),
} satisfies ApiValidator;

export default validator;
