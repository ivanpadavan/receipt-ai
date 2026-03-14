async function createImageFile(url: URL, name: string) {
  const response = await fetch(url.href);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
}

export async function createFirstReceiptFixtureFile() {
  return createImageFile(
    new URL("../receipt/components/__tests__/avatar.png", import.meta.url),
    "receipt-image-1.png",
  );
}

export async function createSecondReceiptFixtureFile() {
  return createImageFile(
    new URL("../../public/images/apple-touch-icon.png", import.meta.url),
    "receipt-image-2.png",
  );
}
