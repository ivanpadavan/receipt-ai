import { ApiValidator } from "@/app/api-client/api-validator";
import {
  receiptChatRequestSchema,
  receiptChatResponseSchema,
} from "@/model/receipt/schema-chat";

const validator: ApiValidator<
  typeof receiptChatRequestSchema,
  typeof receiptChatResponseSchema
> = {
  request: receiptChatRequestSchema,
  response: receiptChatResponseSchema,
};

export default validator;
