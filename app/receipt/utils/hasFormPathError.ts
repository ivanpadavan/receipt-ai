export const hasFormPathError = (errors: unknown, path: string): boolean => {
  const found = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors);

  return found !== undefined;
};

