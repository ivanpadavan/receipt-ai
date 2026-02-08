export const hasFormPathError = (errors: unknown, path: string): boolean => {
  const found = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors);

  return found !== undefined;
};

export const getFormPathErrorMessage = (
  errors: unknown,
  path: string,
): string | undefined => {
  const found = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors);

  if (!found || typeof found !== "object") return undefined;
  const message = (found as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
};
