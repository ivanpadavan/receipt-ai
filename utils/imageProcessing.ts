import { Jimp, ResizeStrategy } from "jimp";
import { createWorker } from "tesseract.js";

// Maximum dimensions for the AI model input
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;

const DEFAULT_MIME = "image/jpeg";

const workerPromise = createWorker("eng");

/**
 * Process an image to crop it to text areas and resize if needed
 * @param imageBase64 - Base64 encoded image data
 * @returns Processed base64 image
 */
export async function processImage(imageBase64: string): Promise<string> {
  try {
    // Extract the base64 data part (remove the data:image/xxx;base64, prefix)
    const base64Data = imageBase64.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // Load the image with Jimp
    const image = await Jimp.read(buffer);

    // Get image dimensions
    const width = image.width;
    const height = image.height;

    // Recognize text in the image to find text areas
    const { data } = await (
      await workerPromise
    ).recognize(
      buffer,
      {},
      {
        text: false,
        blocks: true,
        layoutBlocks: false,
        hocr: false,
        tsv: false,
        box: false,
        unlv: false,
        osd: false,
        pdf: false,
        imageColor: false,
        imageGrey: false,
        imageBinary: false,
        debug: false,
      },
    );
    console.log(data);

    // Extract bounding boxes of text areas
    // Adjust the property access based on Tesseract.js output structure
    const textBoxes = (data.blocks || []).map((word) => word.bbox);

    if (textBoxes.length === 0) {
      console.log("No text detected in the image");
      // If no text is detected, just resize if needed
      return resizeImageIfNeeded(image, imageBase64);
    }

    // Find the bounding box that contains all text
    const minX = Math.max(0, Math.min(...textBoxes.map((box) => box.x0)) - 10);
    const minY = Math.max(0, Math.min(...textBoxes.map((box) => box.y0)) - 10);
    const maxX = Math.min(
      width,
      Math.max(...textBoxes.map((box) => box.x1)) + 10,
    );
    const maxY = Math.min(
      height,
      Math.max(...textBoxes.map((box) => box.y1)) + 10,
    );

    // Crop the image to the text area
    // Create a crop region object
    const cropRegion = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    const croppedImage = image.clone().crop(cropRegion);

    // Convert the cropped image back to base64
    // We don't need mimeType anymore as we're using a fixed MIME type
    const croppedBase64 = await croppedImage.getBase64(DEFAULT_MIME);

    // Resize if needed
    return resizeImageIfNeeded(croppedImage, croppedBase64);
  } catch (error) {
    console.error("Error processing image:", error);
    // Return the original image if processing fails
    return imageBase64;
  }
}

type ResizeImageArg = Pick<ReturnType<(typeof Jimp)["read"]> extends Promise<infer T> ? T : never, 'clone' | 'width' | 'height' | 'resize'>;
/**
 * Resize an image if it exceeds the maximum dimensions
 * @param image - Jimp image object
 * @param imageBase64 - Original base64 image string
 * @returns Resized base64 image or original if no resizing needed
 */
async function resizeImageIfNeeded(
  image: ResizeImageArg,
  imageBase64: string,
): Promise<string> {
  const width = image.width;
  const height = image.height;

  // Check if resizing is needed
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (width > MAX_WIDTH) {
      newWidth = MAX_WIDTH;
      newHeight = Math.floor(height * (MAX_WIDTH / width));
    }

    if (newHeight > MAX_HEIGHT) {
      newHeight = MAX_HEIGHT;
      newWidth = Math.floor(newWidth * (MAX_HEIGHT / newHeight));
    }

    // Resize the image
    const resizedImage = image
      .clone()
      .resize({ w: newWidth, h: newHeight, mode: ResizeStrategy.BILINEAR });

    // Convert back to base64
    return await resizedImage.getBase64(DEFAULT_MIME);
  }

  // No resizing needed
  return imageBase64;
}
