import { ZodTypeAny } from "zod";

export interface ApiValidator<
  TRequest extends ZodTypeAny = ZodTypeAny,
  TResponse extends ZodTypeAny = ZodTypeAny,
> {
  request: TRequest;
  response: TResponse;
}
