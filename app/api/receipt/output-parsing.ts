export const getStructuredOutputFailurePayload = (
  error: unknown,
): { result: string; errors: string } | null => {
  if (typeof error !== "object" || error == null) {
    return null;
  }

  const llmOutput =
    "llmOutput" in error && typeof error.llmOutput === "string"
      ? error.llmOutput
      : null;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "Failed to parse structured receipt output";

  if (!llmOutput) {
    return null;
  }

  return {
    result: llmOutput,
    errors: message,
  };
};
