import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { page } from "vitest/browser";
import userEvent from "@testing-library/user-event";
import { cleanup, render, type RenderResult as BrowserRenderResult } from "vitest-browser-react";
import { setLanguage, t, type Language } from "@/app/i18n/translations";
import { AppLayoutMock } from "@/app/receipt/components/__tests__/AppLayout.mock";
import {
  createBrowserScreen,
  requireElement,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
  waitForDocumentInteractivity,
} from "@/app/receipt/components/__tests__/browser-test-helpers";
import {
  createFirstReceiptFixtureFile,
  createSecondReceiptFixtureFile,
} from "@/app/__tests__/HomePage.browser.fixtures";

const createReceiptMock = vi.fn();

vi.mock("@/app/api-client", () => ({
  apiClient: {
    createReceipt: (...args: unknown[]) => createReceiptMock(...args),
  },
}));

let browserScreen: BrowserRenderResult | null = null;
let activeLanguage: Language = "en";

function getActiveBrowserScreen() {
  if (!browserScreen) {
    throw new Error("browser screen is not initialized");
  }
  return browserScreen;
}

const screen = createBrowserScreen(getActiveBrowserScreen);

function getUploadInputs() {
  return Array.from(document.querySelectorAll<HTMLInputElement>("input[type='file'][accept='image/*']"));
}

function getGalleryUploadInput() {
  return requireElement(
    getUploadInputs().find((input) => !input.hasAttribute("capture")),
    "gallery upload input should be present",
  );
}

async function renderHomePage() {
  setLanguage(activeLanguage);
  const { default: HomePage } = await import("@/app/page");
  browserScreen = await render(
    <AppLayoutMock participants={[]}>
      <HomePage />
    </AppLayoutMock>,
  );

  await waitForDocumentInteractivity();
  return browserScreen;
}

async function expectCurrentScreenshot(name?: string) {
  if (!name || activeLanguage !== "en") {
    return;
  }

  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(name);
}

async function uploadReceiptImage(
  user: ReturnType<typeof userEvent.setup>,
  file: File,
  expectedCount: number,
) {
  await user.upload(getGalleryUploadInput(), file);
  await waitFor(() => {
    expect(
      screen.getAllByRole("img", { name: new RegExp(`^${t("receiptImageAlt")} `) }).length,
    ).toBe(expectedCount);
  });
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe.each<Language>(["en"])("Home page (%s)", (language) => {
  beforeEach(async () => {
    activeLanguage = language;
    setLanguage(activeLanguage);
    vi.clearAllMocks();
    createReceiptMock.mockResolvedValue({ id: "receipt-1" });
    await page.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    await waitForDocumentInteractivity();
  });

  afterEach(async () => {
    browserScreen = null;
    await cleanup();
  });

  it("renders empty upload state", async () => {
    // Arrange
    await renderHomePage();

    // Act

    // Assert
    expect(screen.getByRole("heading", { name: t("receiptScannerTitle") })).toBeInTheDocument();
    expect(screen.getByText(t("uploadReceiptImage"))).toBeInTheDocument();
    expect(screen.getByText(t("tapToSelectOrPaste"))).toBeInTheDocument();
    await expectCurrentScreenshot("home-empty-upload-state");
  });

  it("uploads the first image and shows crop and single-image states", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderHomePage();
    const firstReceiptFile = await createFirstReceiptFixtureFile();

    // Act
    await uploadReceiptImage(user, firstReceiptFile, 1);

    // Assert
    expect(screen.getByRole("button", { name: t("addReceiptImage") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("done") })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `${t("receiptImageAlt")} 1` })).toBeInTheDocument();
    await expectCurrentScreenshot("home-single-image-overlay");
  });

  it("shows loading state after tapping done", async () => {
    // Arrange
    const user = userEvent.setup();
    const deferred = createDeferred<{ id: string }>();
    createReceiptMock.mockReturnValueOnce(deferred.promise);
    await renderHomePage();
    await uploadReceiptImage(user, await createFirstReceiptFixtureFile(), 1);

    // Act
    await user.click(screen.getByRole("button", { name: t("done") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(t("processingReceipt"))).toBeInTheDocument();
    });
    await expectCurrentScreenshot("home-loading-after-done");

    deferred.resolve({ id: "receipt-1" });
  });

  it("shows an error state when receipt processing fails", async () => {
    // Arrange
    const user = userEvent.setup();
    const errorMessage = "Failed to process receipt";
    createReceiptMock.mockRejectedValueOnce(new Error(errorMessage));
    await renderHomePage();
    await uploadReceiptImage(user, await createFirstReceiptFixtureFile(), 1);

    // Act
    await user.click(screen.getByRole("button", { name: t("done") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    await expectCurrentScreenshot("home-processing-error");
  });

  it("adds a second image and shows the multi-image overlay", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderHomePage();
    const firstReceiptFile = await createFirstReceiptFixtureFile();
    const secondReceiptFile = await createSecondReceiptFixtureFile();
    await uploadReceiptImage(user, firstReceiptFile, 1);

    // Act
    await uploadReceiptImage(user, secondReceiptFile, 2);

    // Assert
    expect(screen.getByRole("img", { name: `${t("receiptImageAlt")} 1` })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `${t("receiptImageAlt")} 2` })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: new RegExp(`^${t("receiptImageAlt")} `) })).toHaveLength(2);
    await expectCurrentScreenshot("home-multi-image-overlay");
  });

  it("reopens crop for an existing image", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderHomePage();
    await uploadReceiptImage(user, await createFirstReceiptFixtureFile(), 1);
    await uploadReceiptImage(user, await createSecondReceiptFixtureFile(), 2);

    // Act
    await user.click(screen.getAllByRole("button", { name: t("editImage") })[0]);

    // Assert
    expect(await screen.findByRole("heading", { name: t("cropReceiptImage") })).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    await expectCurrentScreenshot("home-edit-existing-image");
  });

  it("removes one image and clears back to the empty state", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderHomePage();
    await uploadReceiptImage(user, await createFirstReceiptFixtureFile(), 1);
    await uploadReceiptImage(user, await createSecondReceiptFixtureFile(), 2);

    // Act
    const removeButtons = screen.getAllByRole("button", { name: t("removeImage") });
    await user.click(removeButtons[0]);

    // Assert
    await waitFor(() => {
      expect(screen.getAllByRole("img", { name: new RegExp(`^${t("receiptImageAlt")} `) })).toHaveLength(1);
    });
    expect(screen.getByRole("img", { name: `${t("receiptImageAlt")} 1` })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: `${t("receiptImageAlt")} 2` })).not.toBeInTheDocument();
    await expectCurrentScreenshot("home-after-remove-single-image");

    // Act
    await user.click(screen.getByRole("button", { name: t("removeImage") }));

    // Assert
    expect(screen.queryByRole("img", { name: `${t("receiptImageAlt")} 1` })).not.toBeInTheDocument();
    expect(screen.getByText(t("uploadReceiptImage"))).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    await expectCurrentScreenshot("home-cleared-upload-state");
  });
});
