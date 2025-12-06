/**
 * Service for handling receipt-related API calls
 */
export const apiClient = {
  /**
   * Process an image and send it to the receipt API
   * @param imageBase64 - Base64 encoded image data
   * @returns Promise with the receipt data including ID
   */
  async processReceipt(imageBase64: string): Promise<{ id: string }> {
    const image = await import("@/utils/imageProcessing").then(({ processImage }) => processImage(imageBase64));

    const response = await fetch('/api/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to process receipt');
    }

    if (!data.id) {
      throw new Error('No receipt ID returned from the server');
    }

    return data;
  }
}
