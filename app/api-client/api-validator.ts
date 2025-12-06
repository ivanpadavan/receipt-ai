import { ZodType } from "zod";

export interface ApiValidator {
  request: ZodType;
  response: ZodType;
}