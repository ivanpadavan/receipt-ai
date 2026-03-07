import { describe, expect, it } from "vitest";
import { getStructuredOutputFailurePayload } from "@/app/api/receipt/output-parsing";

describe("getStructuredOutputFailurePayload", () => {
  it("extracts llm output and message from structured output parsing errors", () => {
    expect(
      getStructuredOutputFailurePayload({
        message: "Failed to parse",
        llmOutput: '{"totals":{"total":10,"grandTotal":10}}',
      }),
    ).toEqual({
      result: '{"totals":{"total":10,"grandTotal":10}}',
      errors: "Failed to parse",
    });
  });

  it("returns null when there is no llm output to recover from", () => {
    expect(getStructuredOutputFailurePayload(new Error("boom"))).toBeNull();
  });
});
