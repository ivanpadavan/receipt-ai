import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, type RenderResult as BrowserRenderResult } from "vitest-browser-react";
import { setLanguage, t, type Language } from "@/app/i18n/translations";
import { ReceiptWithParticipants } from "@/model/receipt/model";
import { HistoryPageClient } from "@/app/history/HistoryPage.client";
import { AppLayoutMock } from "@/app/receipt/components/__tests__/AppLayout.mock";
import {
  createBrowserScreen,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
  waitForDocumentInteractivity,
} from "@/app/receipt/components/__tests__/browser-test-helpers";
import {
  emptyHistoryReceipts,
  multipleHistoryReceipts,
  singleHistoryReceipt,
} from "@/app/history/__tests__/HistoryPage.browser.fixtures";

let browserScreen: BrowserRenderResult | null = null;
let activeLanguage: Language = "en";

const participants: ReceiptWithParticipants["participants"] = [];

function getActiveBrowserScreen() {
  if (!browserScreen) {
    throw new Error("browser screen is not initialized");
  }
  return browserScreen;
}

const screen = createBrowserScreen(getActiveBrowserScreen);

async function renderHistoryPage(receipts = emptyHistoryReceipts) {
  setLanguage(activeLanguage);

  browserScreen = await render(
    <AppLayoutMock participants={participants}>
      <HistoryPageClient receipts={receipts} />
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

describe.each<Language>(["ru", "en"])("History page (%s)", (language) => {
  beforeEach(async () => {
    activeLanguage = language;
    setLanguage(activeLanguage);
    vi.clearAllMocks();
    await page.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    await waitForDocumentInteractivity();
  });

  afterEach(async () => {
    browserScreen = null;
    await cleanup();
  });

  it("renders empty history state", async () => {
    await renderHistoryPage(emptyHistoryReceipts);

    expect(screen.getByRole("heading", { name: t("receiptHistory") })).toBeInTheDocument();
    expect(screen.getByText(t("noReceiptsYet"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("scanFirstReceipt") })).toBeInTheDocument();
    await expectCurrentScreenshot("history-empty-state");
  });

  it("renders single receipt state", async () => {
    await renderHistoryPage(singleHistoryReceipt);

    expect(screen.getByRole("heading", { name: t("receiptHistory") })).toBeInTheDocument();
    expect(screen.getByText("BBQ Saturday")).toBeInTheDocument();
    expect(screen.getByText(`11 ${t("itemPlural")}`)).toBeInTheDocument();
    await expectCurrentScreenshot("history-single-receipt");
  });

  it("renders multiple receipt cards state", async () => {
    await renderHistoryPage(multipleHistoryReceipts);

    expect(screen.getByRole("heading", { name: t("receiptHistory") })).toBeInTheDocument();
    expect(screen.getByText("BBQ Saturday")).toBeInTheDocument();
    expect(screen.getByText("Coffee with team")).toBeInTheDocument();
    expect(screen.getByText("Taxi")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^1\\s${t("itemSingle")}$`))).toBeInTheDocument();
    await expectCurrentScreenshot("history-multiple-receipts");
  });
});
