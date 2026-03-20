import { ApiValidator } from "@/app/api-client/api-validator";
import {
  receiptChatRequestSchema,
  receiptChatResponseSchema,
} from "@/model/receipt/schema-chat";

const validator = {
  request: receiptChatRequestSchema,
  response: receiptChatResponseSchema,
} satisfies ApiValidator;

export default validator;
