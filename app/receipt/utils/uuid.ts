let hasWarnedFallback = false;

const toHex = (value: number) => value.toString(16).padStart(2, "0");

const fallbackUuid = () => {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return [
      Array.from(bytes.slice(0, 4), toHex).join(""),
      Array.from(bytes.slice(4, 6), toHex).join(""),
      Array.from(bytes.slice(6, 8), toHex).join(""),
      Array.from(bytes.slice(8, 10), toHex).join(""),
      Array.from(bytes.slice(10, 16), toHex).join(""),
    ].join("-");
  }

  const randomChunk = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);

  return `${randomChunk()}${randomChunk()}-${randomChunk()}-4${randomChunk().slice(1)}-${(
    (8 + Math.random() * 4) |
    0
  ).toString(16)}${randomChunk().slice(1)}-${randomChunk()}${randomChunk()}${randomChunk()}`;
};

export const createUuid = () => {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (process.env.NODE_ENV !== "production") {
    if (!hasWarnedFallback) {
      hasWarnedFallback = true;
      console.warn(
        "[receipt] crypto.randomUUID is unavailable, using development fallback UUID.",
      );
    }

    return fallbackUuid();
  }

  throw new Error(
    "crypto.randomUUID is unavailable. Use HTTPS or provide a UUID implementation.",
  );
};

