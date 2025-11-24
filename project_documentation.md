# Receipt AI - Project Documentation

## Project Overview
Receipt AI is a web application designed to digitize and manage receipts. It leverages artificial intelligence to automatically extract structured data from receipt images, making it easier for users to track their expenses.

## Goals
1.  **Receipt Digitization**: Convert physical receipt images into digital, structured data.
2.  **Automated Data Extraction**: Utilize advanced AI (Google Gemini) to accurately identify items, prices, quantities, and totals from receipt images, handling complex layouts and line breaks.
3.  **Data Validation & Correction**: Ensure the accuracy of extracted data through automated validation logic (e.g., checking if totals match) and self-correction mechanisms.
4.  **User History Management**: Provide users with a persistent history of their scanned receipts for future reference and expense tracking.
5.  **Seamless User Experience**: Offer a simple and intuitive interface for uploading or capturing receipt images on both desktop and mobile devices.

## User Scenarios

### 1. Upload or Capture Receipt
*   **Scenario**: A user has a physical receipt they want to digitize.
*   **Action**: The user opens the app and chooses to either upload an existing image from their device or use the built-in camera feature to take a photo of the receipt.
*   **System Response**: The app accepts the image and displays a preview, allowing the user to confirm the image before processing.

### 2. Automatic Data Extraction
*   **Scenario**: The user has submitted a receipt image.
*   **Action**: The user clicks "Extract Receipt Data".
*   **System Response**: The system sends the image to the backend, where it is processed by the Google Gemini AI model. The system extracts:
    *   Individual items (names, quantities, prices)
    *   Total amounts
    *   Modifiers (discounts, taxes, tips)
*   **Validation**: The system automatically validates the extracted data. If discrepancies are found (e.g., sum of items does not equal total), it attempts to self-correct using the AI model.

### 3. Review and Edit Receipt
*   **Scenario**: The extraction process is complete.
*   **Action**: The user is redirected to a detailed view of the processed receipt.
*   **System Response**: The app displays the extracted data in a structured form. The user can review the items and prices against the original receipt. (Note: The codebase includes a `ReceiptForm` component, implying the ability to view and potentially edit the data).

### 4. View Receipt History
*   **Scenario**: A user wants to see a receipt they scanned last week.
*   **Action**: The user navigates to the "History" section of the app.
*   **System Response**: The app displays a list of all previously processed receipts, sorted by date. The user can click on any receipt to view its full details.

## Technical Stack
*   **Frontend**: Next.js (React), Tailwind CSS
*   **State Management**: RxJS, @ngneat/elf, @ngneat/effects
*   **Backend**: Next.js API Routes
*   **Database**: Prisma (SQLite/LibSQL)
*   **AI/ML**: Google Gemini (via LangChain)
*   **Image Processing**: Tesseract.js (dependency present), Jimp
*   **Authentication**: NextAuth.js
