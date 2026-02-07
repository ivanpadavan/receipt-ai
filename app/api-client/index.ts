import postValidator from "./receipt/post";
import putValidator from "./receipt/put";
import { ApiValidator } from "@/app/api-client/api-validator";

async function requestWrapper<T extends ApiValidator>(
  apiPath: string,
  method: "POST" | "PUT",
  validator: T,
  body: ReturnType<T["request"]["parse"]>,
): Promise<ReturnType<T["response"]["parse"]>> {
  const response = await fetch(apiPath, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (response.status !== 200) {
    if (
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof json.error === "string"
    ) {
      throw new Error(json.error);
    } else {
      throw Error("Something went wrong. Please try again later");
    }
  }
  return validator.response.parse(json);
}
/**
 * Service for handling receipt-related API calls
 */
export const apiClient = {
  /**
   * Process an image and send it to the receipt API
   * @param imageBase64 - Base64 encoded image data
   * @returns Promise with the receipt data including ID
   */
  async createReceipt(imageBase64: string) {
    const image = await import("@/utils/imageProcessing").then(
      ({ processImage }) => processImage(imageBase64),
    );
    return requestWrapper("/api/receipt", "POST", postValidator, { image });
  },

  async updateReceipt(
    receiptId: string,
    receipt: ReturnType<(typeof putValidator)["request"]["parse"]>,
  ) {
    return requestWrapper(
      `/api/receipt/${receiptId}`,
      "PUT",
      putValidator,
      receipt,
    );
  },
};
