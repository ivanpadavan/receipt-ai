import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { page } from "vitest/browser";
import userEvent from "@testing-library/user-event";
import { setLanguage, t, type Language } from "@/app/i18n/translations";
import { Receipt, ReceiptWithParticipants } from "@/model/receipt/model";
import { cleanup, render, type RenderResult as BrowserRenderResult } from "vitest-browser-react";
import {
  amountMaxSwitchReceipt,
  fullyDistributedReceipt,
  invalidNameReceipt,
  invalidOverallMismatchReceipt,
  invalidPositionAndTotalsReceipt,
  invalidReceipt,
  invalidReviewReceipt,
  invalidZeroPositionReceipt,
  joinedParticipants,
  overClaimedReceipt,
  partiallyDistributedReceipt,
  quantityMaxSwitchReceipt,
  receiptWithModifiers,
  splittingParticipants,
  summaryBalancedReceipt,
  summaryRemainingReceipt,
  validReceipt,
} from "./ReceiptFormInner.browser.fixtures";
import {
  createBrowserScreen,
  isPointerInteractive,
  requireElement,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
  waitForDocumentInteractivity,
} from "./browser-test-helpers";
import { AppLayoutMock } from "./AppLayout.mock";

let browserScreen: BrowserRenderResult | null = null;
let activeLanguage: Language = "en";

function getActiveBrowserScreen() {
  if (!browserScreen) {
    throw new Error("browser screen is not initialized");
  }
  return browserScreen;
}

const screen = createBrowserScreen(getActiveBrowserScreen);

export const updateReceiptMock = vi.fn();

vi.mock("@/app/api-client", () => ({
  apiClient: {
    createReceipt: vi.fn(),
    updateReceipt: (...args: unknown[]) => updateReceiptMock(...args),
  },
}));

export const setSummaryQueryMock = vi.fn();

let summaryQueryValue: string | null = null;

vi.mock("nuqs", () => ({
  useQueryState: () => [summaryQueryValue, setSummaryQueryMock],
}));

async function renderReceiptFormInner({
  receipt = validReceipt,
  participants = joinedParticipants,
}: {
  receipt?: Receipt;
  participants?: ReceiptWithParticipants["participants"];
} = {}) {
  const translations = await import("@/app/i18n/translations");
  translations.setLanguage(activeLanguage);
  const { ReceiptFormInner } = await import("@/app/receipt/components/ReceiptForm");
  const ui = (
    <AppLayoutMock participants={participants}>
      <ReceiptFormInner
        receipt={receipt}
        participants={participants}
        receiptId="receipt-1"
      />
    </AppLayoutMock>
  );

  browserScreen = await render(ui);
  await waitForDocumentInteractivity();
  return browserScreen;
}

async function renderReceiptFormHarness({
  receipt = structuredClone(validReceipt),
  participants = structuredClone(joinedParticipants),
  echoReceiptUpdates = true,
}: {
  receipt?: Receipt;
  participants?: ReceiptWithParticipants["participants"];
  echoReceiptUpdates?: boolean;
} = {}) {
  const translations = await import("@/app/i18n/translations");
  translations.setLanguage(activeLanguage);
  const { ReceiptFormInner } = await import("@/app/receipt/components/ReceiptForm");
  const controls: { pushReceipt?: (nextReceipt: Receipt) => void } = {};

  const ReceiptFormHarness: React.FC = () => {
    const [currentReceipt, setCurrentReceipt] = React.useState(receipt);
    // eslint-disable-next-line react-hooks/immutability
    controls.pushReceipt = setCurrentReceipt;

    React.useEffect(() => {
      updateReceiptMock.mockImplementation(async (_receiptId: string, nextReceipt: Receipt) => {
        if (echoReceiptUpdates) {
          setCurrentReceipt(nextReceipt);
        }
        return nextReceipt;
      });
    }, []);

    return (
      <AppLayoutMock participants={participants}>
        <ReceiptFormInner
          receipt={currentReceipt}
          participants={participants}
          receiptId="receipt-1"
        />
      </AppLayoutMock>
    );
  };

  browserScreen = await render(<ReceiptFormHarness />);
  await waitForDocumentInteractivity();

  return {
    ...browserScreen,
    pushReceipt: (nextReceipt: Receipt) => controls.pushReceipt?.(nextReceipt),
  };
}

function getSearchButton() {
  return requireElement(
    screen.getAllByRole("button").find((button) =>
      button.getAttribute("aria-label") === t("search"),
    ),
    'Search button should be present',
  );
}

function getCloseSearchButton() {
  return requireElement(
    screen.getAllByRole("button").find((button) =>
      button.getAttribute("aria-label") === t("close") &&
      isPointerInteractive(button),
    ),
    'Close search button should be present',
  );
}

function getPositionButtonByText(fragment: string) {
  return requireElement(
    screen.getAllByRole("button").find((button) =>
      button.textContent?.includes(fragment) &&
      isPointerInteractive(button),
    ),
    `position button containing "${fragment}" should be present`,
  );
}

function getClaimButtonByText(fragment: string) {
  const normalizedFragment = fragment.replace(/\s+/g, "");

  return requireElement(
    screen.getAllByRole("button").find((button) =>
      (button.textContent?.replace(/\s+/g, "") ?? "").startsWith(normalizedFragment),
    ),
    `claim button starting with "${fragment}" should be present`,
  );
}

function queryClaimButtonByText(fragment: string) {
  const normalizedFragment = fragment.replace(/\s+/g, "");

  return screen.getAllByRole("button").find((button) =>
    (button.textContent?.replace(/\s+/g, "") ?? "").startsWith(normalizedFragment),
  );
}

function getButtonByExactText(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  return requireElement(
    screen.getAllByRole("button").find((button) =>
      button.textContent?.trim().toLowerCase() === normalizedLabel &&
      isPointerInteractive(button),
    ),
    `button "${label}" should be present`,
  );
}

function getActionBarEditButton() {
  return requireElement(
    screen.getAllByRole("button").find((button) =>
      button.getAttribute("aria-label") === t("edit") &&
      isPointerInteractive(button),
    ),
    "action bar edit button should be present",
  );
}

function getOpenDrawerButtonByText(label: string) {
  const openDrawer = document.querySelector<HTMLElement>("[data-vaul-drawer][data-state='open']");

  if (!openDrawer) {
    throw new Error("open drawer should be present");
  }

  return requireElement(
    Array.from(openDrawer.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === label,
    ),
    `open drawer button "${label}" should be present`,
  );
}

function queryZeroPositionButton() {
  return screen.getAllByRole("button").find(
    (button) =>
      button.textContent?.includes("0 ₽") &&
      button.textContent?.includes("0x") &&
      isPointerInteractive(button)
  );
}

function getInteractiveButtonByFragments(fragments: string[]) {
  return requireElement(
    screen.getAllByRole("button").find((button) =>
      fragments.every((fragment) => button.textContent?.includes(fragment)) &&
      isPointerInteractive(button),
    ),
    `interactive button containing fragments "${fragments.join('", "')}" should be present`,
  );
}

async function findInteractiveButtonByText(fragment: string) {
  let button: HTMLElement | undefined;
  await waitFor(() => {
    button = screen.getAllByRole("button").find((candidate) =>
      candidate.textContent?.includes(fragment) &&
      isPointerInteractive(candidate)
    );
    expect(button, `interactive button containing "${fragment}" should be present`).toBeDefined();
  });
  return requireElement(button, `interactive button containing "${fragment}" should be present`);
}

async function findInteractiveButtonByFragments(fragments: string[]) {
  let button: HTMLElement | undefined;
  await waitFor(() => {
    button = screen.getAllByRole("button").find((candidate) =>
      fragments.every((fragment) => candidate.textContent?.includes(fragment)) &&
      isPointerInteractive(candidate)
    );
    expect(
      button,
      `interactive button containing fragments "${fragments.join('", "')}" should be present`,
    ).toBeDefined();
  });
  return requireElement(
    button,
    `interactive button containing fragments "${fragments.join('", "')}" should be present`,
  );
}

async function findZeroPositionButton() {
  let button: HTMLElement | undefined;
  await waitFor(() => {
    button = screen.getAllByRole("button").find(
      (candidate) =>
        candidate.textContent?.includes("0 ₽") &&
        candidate.textContent?.includes("0x") &&
        isPointerInteractive(candidate),
    );
    expect(button, "zero-zero position button should be present").toBeDefined();
  });
  return requireElement(button, "zero-zero position button should be present");
}

async function openSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getSearchButton());
  return screen.findByRole("textbox");
}

async function openSplittingSheetFor(
  user: ReturnType<typeof userEvent.setup>,
  fragment: string,
) {
  const positionButton = getPositionButtonByText(fragment);
  await user.click(positionButton);
  await screen.findByRole("heading", { name: fragment });
}

async function expectCurrentScreenshot(name?: string) {
  if (!name || activeLanguage !== "en") {
    return;
  }

  if (name.startsWith("validation-")) {
    await waitFor(() => {
      const reviewToast = document.querySelector("[data-sonner-toast]");
      if (!reviewToast) {
        throw new Error("validation review toast is not visible yet");
      }
    });
  }

  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(name);
}

async function openActionBarMenuItem(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  const editButton = getActionBarEditButton();
  await user.click(editButton);
  await user.click(screen.getByRole("menuitem", { name: label }));
}

function tWithColon(key: "fees" | "discounts") {
  return `${t(key)}:`;
}

function claimButtonText(value: string, amount: string) {
  return `${value}${t("pcs")}=${amount}₽`;
}

function remainingText(value: string) {
  return `${t("remaining")}: ${value}`;
}

describe.each<Language>(["ru", "en"])("Receipt flow (%s)", (language) => {
  beforeEach(async () => {
    activeLanguage = language;
    setLanguage(activeLanguage);
    document.body.style.pointerEvents = "";
    await page.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    vi.clearAllMocks();
    summaryQueryValue = null;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      "test-publishable-key",
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY =
      "test-publishable-key";
    updateReceiptMock.mockResolvedValue(validReceipt);
    await waitForDocumentInteractivity();
  });

  afterEach(async () => {
    browserScreen = null;
    vi.unstubAllEnvs();
    await cleanup();
    document.body.style.pointerEvents = "";
  });

  it("renders the splitting flow for a joined participant", async () => {
    // Arrange
    await renderReceiptFormInner();

    // Act
    const positions = screen.getAllByRole("button").filter((button) =>
      ["Milk", "Bread", "Butter"].some((name) =>
        button.textContent?.includes(name),
      ),
    );

    // Assert
    expect(screen.getByRole("heading", { name: t("receipt") })).toBeInTheDocument();
    expect(positions).toHaveLength(3);
    expect(screen.getByText(new RegExp(`^${t("total")}$`))).toBeInTheDocument();
    expect(screen.getByText(t("grandTotal"))).toBeInTheDocument();
    expect(getSearchButton()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("participants") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("done") })).toBeInTheDocument();
    expect(screen.queryByText(t("settings"))).not.toBeInTheDocument();
    await expectCurrentScreenshot("receipt-overview");
  });

  it("starts invalid receipts in review mode with disabled proceed", async () => {
    // Arrange
    await renderReceiptFormInner({ receipt: invalidReviewReceipt });

    // Act
    const reviewAction = screen.getByRole("button", { name: t("done") });

    // Assert
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText("Loyalty")).toBeInTheDocument();
    expect(screen.getAllByText("999 ₽").length).toBeGreaterThan(0);
    expect(getSearchButton()).toBeInTheDocument();
    expect(reviewAction).toBeDisabled();
    await expectCurrentScreenshot("invalid-review-mode");
  });

  it("renders summary mode from the query state and hides search", async () => {
    // Arrange
    summaryQueryValue = "1";

    // Act
    await renderReceiptFormInner();

    // Assert
    expect(screen.queryByRole("heading", { name: t("receipt") })).not.toBeInTheDocument();
    expect(screen.getByText(t("noClaims"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("toSplitting") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("search") })).not.toBeInTheDocument();
    await expectCurrentScreenshot("summary-empty-state");
  });

  it("ignores the summary query for an invalid receipt and stays in validation mode", async () => {
    // Arrange
    summaryQueryValue = "1";

    // Act
    await renderReceiptFormInner({ receipt: invalidReceipt });

    // Assert
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("done") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("search") })).toBeInTheDocument();
    expect(screen.queryByText(t("noClaims"))).not.toBeInTheDocument();
    await expectCurrentScreenshot("summary-invalid-query-fallback");
  });

  it("writes summary query when proceeding from splitting", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await user.click(screen.getByRole("button", { name: t("done") }));

    // Assert
    expect(setSummaryQueryMock).toHaveBeenCalledWith("1", {
      history: "push",
      scroll: true,
    });
    await expectCurrentScreenshot("transition-splitting-primary-action");
  });

  it("clears summary query when returning from summary", async () => {
    // Arrange
    const user = userEvent.setup();
    summaryQueryValue = "1";
    await renderReceiptFormInner();

    // Act
    await user.click(screen.getByRole("button", { name: t("toSplitting") }));

    // Assert
    expect(setSummaryQueryMock).toHaveBeenCalledWith(null, {
      history: "push",
      scroll: true,
    });
    await expectCurrentScreenshot("transition-summary-primary-action");
  });

  it("filters positions through search", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    const searchInput = await openSearch(user);
    expect(searchInput).toHaveFocus();
    await user.type(searchInput, "milk");

    // Assert
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();
    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
    await expectCurrentScreenshot("search-filtered-milk");
  });

  it("shows empty state for unmatched search while keeping totals visible", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    const searchInput = await openSearch(user);
    await user.type(searchInput, "zzz");

    // Assert
    expect(screen.getByText(t("searchNoResults"))).toBeInTheDocument();
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${t("total")}$`))).toBeInTheDocument();
    expect(screen.getByText(t("grandTotal"))).toBeInTheDocument();
    await expectCurrentScreenshot("search-empty-state");
  });

  it("clears the query before closing search", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "bread");

    // Act
    await user.click(getCloseSearchButton());

    // Assert
    expect(searchInput).toHaveValue("");
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("Butter")).toBeInTheDocument();
    await expectCurrentScreenshot("search-query-cleared");
  });

  it("keeps the search input focused when the close button clears a non-empty query", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "bread");

    // Act
    await user.click(getCloseSearchButton());

    // Assert
    expect(screen.getByRole("textbox")).toHaveFocus();
    expect(screen.getByRole("textbox")).toHaveValue("");
    await expectCurrentScreenshot("search-query-cleared-focused");
  });

  it("closes empty search on blur", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "bread");
    await user.click(getCloseSearchButton());

    // Act
    await user.click(screen.getByRole("textbox"));
    await user.tab();

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    expect(getSearchButton()).toBeInTheDocument();
    await expectCurrentScreenshot("search-closed-on-blur");
  });

  it("reopens search when the user taps Search again after blur closes it", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);

    // Act
    searchInput.blur();
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    await user.click(getSearchButton());

    // Assert
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(getSearchButton()).toBeInTheDocument();
    await expectCurrentScreenshot("search-open-empty");
  });

  it("closes search on Escape and clears the current filtered state", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("Butter")).toBeInTheDocument();
    await expectCurrentScreenshot("search-escape-clears-and-closes");
  });

  it("treats whitespace-only search like an empty query", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    const searchInput = await openSearch(user);
    await user.type(searchInput, "   ");

    // Assert
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("Butter")).toBeInTheDocument();
    expect(screen.queryByText(t("searchNoResults"))).not.toBeInTheDocument();
    await expectCurrentScreenshot("search-whitespace-query");
  });

  it("reopens search with an empty query after Escape clears it", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    await user.click(getSearchButton());

    // Assert
    expect(await screen.findByDisplayValue("")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    await expectCurrentScreenshot("search-reopened-after-escape");
  });

  it("keeps the filtered search state when opening splitting sheet", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await user.click(getInteractiveButtonByFragments(["Milk", "801 ₽"]));

    // Assert
    expect(screen.getByRole("heading", { name: "Milk" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("milk")).toBeInTheDocument();
    expect(screen.getAllByText("Milk").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();
    await expectCurrentScreenshot("search-over-splitting-sheet");
  });

  it("removes a position from filtered results when a receipt update renames it away from the query", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await act(async () => {
      harness.pushReceipt?.({
        ...validReceipt,
        positions: [
          {
            ...validReceipt.positions[0],
            name: "Tea",
          },
          validReceipt.positions[1],
          validReceipt.positions[2],
        ],
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(t("searchNoResults"))).toBeInTheDocument();
    });
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    expect(screen.queryByText("Tea")).not.toBeInTheDocument();
    await expectCurrentScreenshot("search-rename-removed-match");
  });

  it("adds a position into filtered results when a receipt update renames it to match the query", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await act(async () => {
      harness.pushReceipt?.({
        ...validReceipt,
        positions: [
          validReceipt.positions[0],
          {
            ...validReceipt.positions[1],
            name: "Milk Bread",
          },
          validReceipt.positions[2],
        ],
      });
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Milk Bread")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Milk").length).toBeGreaterThan(0);
    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
    await expectCurrentScreenshot("search-rename-added-match");
  });

  it("opens splitting with a draft editor for a partially distributed position and prioritizes the current user", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");

    // Assert
    expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("selectAll") })).toBeInTheDocument();

    const participantButtons = screen.getAllByRole("button").filter((button) =>
      ["Anton", "Ivan", "Polina"].some((name) => button.textContent?.includes(name)),
    );
    expect(participantButtons.map((button) =>
      ["Ivan", "Anton", "Polina"].find((name) => button.textContent?.includes(name)),
    )).toEqual([
      "Ivan",
      "Anton",
      "Polina",
    ]);

    await expectCurrentScreenshot("splitting-draft-editor");
  });

  it("opens splitting without a draft editor for a fully distributed position", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: fullyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");

    // Assert
    expect(screen.queryByRole("button", { name: t("save") })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: t("edit") }).length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(`2\\s*${t("pcs")}\\s*×\\s*150\\s*₽\\s*=`, "i"))).toBeInTheDocument();

    await expectCurrentScreenshot("splitting-claims-list");
  });

  it("keeps trailing decimal separator while typing in the splitting draft editor", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    const input = screen.getAllByRole("textbox")[0];
    await user.clear(input);
    await user.type(input, "1.");

    // Assert
    expect(input).toHaveValue("1.");
    await expectCurrentScreenshot("splitting-trailing-decimal");
  });

  it("converts a leading dot into 0. in the splitting draft editor", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    const input = screen.getAllByRole("textbox")[0];
    await user.clear(input);
    await user.type(input, ".");

    // Assert
    expect(input).toHaveValue("0.");
    await expectCurrentScreenshot("splitting-leading-dot-normalized");
  });

  it("opens a new draft editor from add share for a fully distributed position", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: fullyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(screen.getByRole("button", { name: t("addShare") }));

    // Assert
    expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    expect(
      screen.getAllByRole("button").some((button) =>
        [t("selectAll"), t("clearAll")].includes(button.textContent?.trim() ?? ""),
      ),
    ).toBe(true);
    await expectCurrentScreenshot("splitting-add-share-draft");
  });

  it("saves a new splitting claim from the draft editor", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    const input = screen.getAllByRole("textbox")[0];
    await user.type(input, "1");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    expect(screen.queryByRole("button", { name: t("save") })).not.toBeInTheDocument();
    expect(getClaimButtonByText(claimButtonText("1", "150"))).toBeInTheDocument();
    await expectCurrentScreenshot("splitting-claim-created");
  });

  it("saves edits for an existing splitting claim", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: quantityMaxSwitchReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(getClaimButtonByText(claimButtonText("1", "150")));
    const input = screen.getAllByRole("textbox")[0];
    await user.clear(input);
    await user.type(input, "0.5");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    expect(screen.queryByRole("button", { name: t("save") })).not.toBeInTheDocument();
    expect(getClaimButtonByText(claimButtonText("0.5", "75"))).toBeInTheDocument();
    await expectCurrentScreenshot("splitting-claim-edited");
  });

  it("toggles select all and clear all in the splitting draft editor", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(screen.getByRole("button", { name: t("selectAll") }));

    // Assert
    expect(screen.getByRole("button", { name: t("clearAll") })).toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", { name: t("clearAll") }));

    // Assert
    expect(screen.getByRole("button", { name: t("selectAll") })).toBeInTheDocument();
    await expectCurrentScreenshot("splitting-select-all-cleared");
  });

  it("toggles individual participant selection in the splitting draft editor", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(screen.getByRole("button", { name: /Anton/i }));

    // Assert
    expect(screen.getByRole("button", { name: t("selectAll") })).toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", { name: /Anton/i }));

    // Assert
    expect(screen.getByRole("button", { name: t("selectAll") })).toBeInTheDocument();
    await expectCurrentScreenshot("splitting-participant-toggled");
  });

  it("recalculates max state when switching a quantity claim to amount", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: quantityMaxSwitchReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(getClaimButtonByText(claimButtonText("1", "150")));

    // Assert
    const maxButton = screen.getByRole("button", { name: t("max") });
    expect(maxButton).toHaveAttribute("aria-pressed", "true");

    // Act
    await user.click(getButtonByExactText("₽"));

    // Assert
    expect(maxButton).toHaveAttribute("aria-pressed", "false");
    await expectCurrentScreenshot("splitting-quantity-to-amount-switch");
  });

  it("applies max value in quantity mode", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(screen.getByRole("button", { name: t("max") }));

    // Assert
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("1");
    expect(screen.getByRole("button", { name: t("max") })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expectCurrentScreenshot("splitting-max-quantity");
  });

  it("applies max value in amount mode", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: partiallyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(getButtonByExactText("₽"));
    await user.click(screen.getByRole("button", { name: t("max") }));

    // Assert
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("150");
    expect(screen.getByRole("button", { name: t("max") })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expectCurrentScreenshot("splitting-max-amount");
  });

  it("disables saving when an amount max becomes invalid after switching to quantity", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: amountMaxSwitchReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(getClaimButtonByText("150₽"));

    // Assert
    const maxButton = screen.getByRole("button", { name: t("max") });
    expect(maxButton).toHaveAttribute("aria-pressed", "true");

    // Act
    await user.click(getButtonByExactText("ШТ"));

    // Assert
    expect(maxButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    await expectCurrentScreenshot("splitting-invalid-max-switch");
  });

  it("deletes an existing splitting claim from the sheet", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: quantityMaxSwitchReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(screen.getAllByRole("button", { name: t("edit") })[1]);
    await user.click(screen.getByRole("menuitem", { name: t("delete") }));

    // Assert
    expect(queryClaimButtonByText(claimButtonText("1", "150"))).toBeUndefined();
    await expectCurrentScreenshot("splitting-claim-deleted");
  });

  it("closes the splitting sheet with done when there is no active draft", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({
      receipt: fullyDistributedReceipt,
      participants: splittingParticipants,
    });

    // Act
    await openSplittingSheetFor(user, "Bread");
    await user.click(getOpenDrawerButtonByText(t("done")));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Bread" })).not.toBeInTheDocument();
    });
    await expectCurrentScreenshot("splitting-sheet-closed");
  });

  it("keeps the filtered search state when opening participants sheet", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await user.click(screen.getByRole("button", { name: t("participants") }));

    // Assert
    expect(screen.getByRole("heading", { name: t("participants") })).toBeInTheDocument();
    expect(screen.getByDisplayValue("milk")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
    await expectCurrentScreenshot("search-over-participants-sheet");
  });

  it("opens the action bar add menu", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await user.click(getActionBarEditButton());

    // Assert
    expect(screen.getByRole("menuitem", { name: t("addPosition") })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("addDiscount") })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("addFee") })).toBeInTheDocument();
    await expectCurrentScreenshot("action-bar-add-menu-open");
  });

  it("opens add position editing from the action bar in validation mode with editable overall", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: invalidReceipt });

    // Act
    await openActionBarMenuItem(user, t("addPosition"));

    // Assert
    const inputs = await screen.findAllByRole("spinbutton");
    expect(screen.getByRole("heading", { name: t("addPosition") })).toBeInTheDocument();
    expect(inputs).toHaveLength(3);
    expect(inputs.every((input) => !input.hasAttribute("disabled"))).toBe(true);
    expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    await expectCurrentScreenshot("validation-add-position-dialog");
  });

  it("adds a new position from the action bar in splitting mode", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await openActionBarMenuItem(user, t("addPosition"));

    const nameInput = await screen.findByRole("textbox");
    const numberInputs = screen.getAllByRole("spinbutton");
    const priceInput = numberInputs[0];
    const quantityInput = numberInputs[1];
    const overallInput = numberInputs[2];

    await user.type(nameInput, "Tea");
    await user.clear(priceInput);
    await user.type(priceInput, "100");
    await user.clear(quantityInput);
    await user.type(quantityInput, "2");
    expect(overallInput).toBeDisabled();
    await waitFor(() => {
      expect(overallInput).toHaveValue(200);
    });
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Tea")).toBeInTheDocument();
    });
    expect(screen.getAllByText("200 ₽").length).toBeGreaterThan(0);
    await expectCurrentScreenshot("position-added");
  });

  it("adds a fee from the action bar", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await openActionBarMenuItem(user, t("addFee"));

    const nameInput = await screen.findByRole("textbox");
    const valueInput = screen.getByRole("spinbutton");
    await user.type(nameInput, "Delivery");
    await user.clear(valueInput);
    await user.type(valueInput, "100");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(tWithColon("fees"))).toBeInTheDocument();
    });
    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText(t("grandTotal"))).toBeInTheDocument();
    await expectCurrentScreenshot("modifiers-add-fee");
  });

  it("adds a discount from the action bar", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await openActionBarMenuItem(user, t("addDiscount"));

    const nameInput = await screen.findByRole("textbox");
    const valueInput = screen.getByRole("spinbutton");
    await user.type(nameInput, "Promo");
    await user.clear(valueInput);
    await user.type(valueInput, "50");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(tWithColon("discounts"))).toBeInTheDocument();
    });
    expect(screen.getByText("Promo")).toBeInTheDocument();
    expect(screen.getByText(t("grandTotal"))).toBeInTheDocument();
    await expectCurrentScreenshot("modifiers-add-discount");
  });

  it("saves edits for an existing fee", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: receiptWithModifiers });

    // Act
    await user.click(await findInteractiveButtonByText("Delivery"));

    const nameInput = await screen.findByDisplayValue("Delivery");
    const valueInput = screen.getByRole("spinbutton");
    await user.clear(nameInput);
    await user.type(nameInput, "Service");
    await user.clear(valueInput);
    await user.type(valueInput, "120");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Service")).toBeInTheDocument();
    });
    expect(screen.getByText(tWithColon("fees"))).toBeInTheDocument();
    await expectCurrentScreenshot("modifiers-fee-edited");
  });

  it("saves edits for an existing discount", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: receiptWithModifiers });

    // Act
    await user.click(await findInteractiveButtonByText("Loyalty"));

    const nameInput = await screen.findByDisplayValue("Loyalty");
    const valueInput = screen.getByRole("spinbutton");
    await user.clear(nameInput);
    await user.type(nameInput, "Weekend");
    await user.clear(valueInput);
    await user.type(valueInput, "80");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Weekend")).toBeInTheDocument();
    });
    expect(screen.getByText(tWithColon("discounts"))).toBeInTheDocument();
    await expectCurrentScreenshot("modifiers-discount-edited");
  });

  it("removes an existing fee", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: receiptWithModifiers });

    // Act
    await user.click(await findInteractiveButtonByText("Delivery"));
    await user.click(screen.getByRole("button", { name: t("remove") }));

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Delivery")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(tWithColon("fees"))).not.toBeInTheDocument();
    expect(screen.getByText("Loyalty")).toBeInTheDocument();
    await expectCurrentScreenshot("modifiers-fee-deleted");
  });

  it("removes an existing discount", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: receiptWithModifiers });

    // Act
    await user.click(await findInteractiveButtonByText("Loyalty"));
    await user.click(screen.getByRole("button", { name: t("remove") }));

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Loyalty")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(tWithColon("discounts"))).not.toBeInTheDocument();
    expect(screen.getByText("Delivery")).toBeInTheDocument();
    await expectCurrentScreenshot("modifiers-discount-deleted");
  });

  it("saves totals edits before the server echo arrives", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormHarness({ receipt: invalidReceipt, echoReceiptUpdates: false });

    // Act
    await user.click(await findInteractiveButtonByFragments([t("total"), "9999 ₽"]));

    const totalInputs = await screen.findAllByRole("spinbutton");
    await user.clear(totalInputs[0]);
    await user.type(totalInputs[0], "1321");
    await user.clear(totalInputs[1]);
    await user.type(totalInputs[1], "1321");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getAllByText("1321 ₽").length).toBeGreaterThan(0);
    });
    await expectCurrentScreenshot("validation-totals-optimistic");
  });

  it("opens position editing in validation mode with save disabled for an invalid name", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: invalidPositionAndTotalsReceipt });

    // Act
    await user.click(await findInteractiveButtonByFragments(["801 ₽", "x"]));

    // Assert
    expect(await screen.findByDisplayValue("")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    await expectCurrentScreenshot("validation-position-invalid-dialog");
  });

  it("opens position editing in validation mode with mismatched overall", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: invalidOverallMismatchReceipt });

    // Act
    await user.click(await findInteractiveButtonByFragments(["999 ₽", "x"]));

    // Assert
    expect(await screen.findByDisplayValue("999")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    await expectCurrentScreenshot("validation-position-overall-mismatch-dialog");
  });

  it("removes an invalid zero-zero position and reaches a valid state after the server confirms deletion", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({
      receipt: invalidZeroPositionReceipt,
      echoReceiptUpdates: false,
    });
    expect(screen.getByRole("button", { name: t("done") })).toBeDisabled();
    await expectCurrentScreenshot("zero-zero-before-delete");

    // Act
    await user.click(await findZeroPositionButton());
    await user.click(screen.getByRole("button", { name: t("remove") }));
    await act(async () => {
      harness.pushReceipt?.(structuredClone(invalidZeroPositionReceipt));
    });
    await act(async () => {
      harness.pushReceipt?.(validReceipt);
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("done") })).toBeEnabled();
    });
    expect(queryZeroPositionButton()).toBeUndefined();
    await expectCurrentScreenshot("zero-zero-after-delete");
  });

  it("does not resurrect a removed invalid zero-zero position when the next server update already reflects the deletion", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({
      receipt: invalidZeroPositionReceipt,
      echoReceiptUpdates: false,
    });

    // Act
    await user.click(await findZeroPositionButton());
    await user.click(screen.getByRole("button", { name: t("remove") }));
    await act(async () => {
      harness.pushReceipt?.(structuredClone(invalidZeroPositionReceipt));
    });
    await act(async () => {
      harness.pushReceipt?.(validReceipt);
    });

    // Assert
    await waitFor(() => {
      expect(queryZeroPositionButton()).toBeUndefined();
    });
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    await expectCurrentScreenshot("zero-zero-not-resurrected");
  });

  it("opens totals editing in validation mode with invalid values prefilled and save disabled", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: invalidReceipt });

    // Act
    await user.click(await findInteractiveButtonByFragments([t("total"), "9999 ₽"]));

    // Assert
    const totalInputs = await screen.findAllByRole("spinbutton");
    expect(totalInputs[0]).toHaveValue(9999);
    expect(totalInputs[1]).toHaveValue(9999);
    expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    await expectCurrentScreenshot("validation-totals-invalid-dialog");
  });

  it("transitions from invalid to valid after editing totals", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({ receipt: invalidReceipt });
    expect(screen.getByRole("button", { name: t("done") })).toBeDisabled();

    // Act
    await user.click(await findInteractiveButtonByFragments([t("total"), "9999 ₽"]));

    const totalInputs = await screen.findAllByRole("spinbutton");
    await user.clear(totalInputs[0]);
    await user.type(totalInputs[0], "1321");
    await user.clear(totalInputs[1]);
    await user.type(totalInputs[1], "1321");
    await user.click(screen.getByRole("button", { name: t("save") }));
    harness.pushReceipt?.(validReceipt);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("done") })).toBeEnabled();
    });
    expect(screen.getByText(new RegExp(`^${t("total")}$`))).toBeInTheDocument();
    expect(screen.getAllByText("1321 ₽").length).toBeGreaterThan(0);
    await expectCurrentScreenshot("validation-totals-fixed");
  });

  it("transitions from invalid to valid after editing a position", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({ receipt: invalidNameReceipt });
    expect(screen.getByRole("button", { name: t("done") })).toBeDisabled();

    // Act
    await user.click(await findInteractiveButtonByFragments(["801 ₽", "x"]));

    const nameInput = await screen.findByDisplayValue("");
    await user.type(nameInput, "Milk");
    await user.click(screen.getByRole("button", { name: t("save") }));
    harness.pushReceipt?.(validReceipt);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("done") })).toBeEnabled();
    });
    expect(screen.getByText("Milk")).toBeInTheDocument();
    await expectCurrentScreenshot("validation-position-fixed");
  });

  it("keeps claim error after shrinking a claimed position below distributed quantity", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormHarness({ receipt: overClaimedReceipt });

    // Act
    await user.click(await findInteractiveButtonByText("Bread"));
    await user.click(screen.getAllByRole("button", { name: t("edit") })[0]);

    const quantityInput = screen.getAllByRole("spinbutton")[1];
    await user.clear(quantityInput);
    await user.type(quantityInput, "1");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    expect(
      await screen.findAllByText(t("validationClaimedQuantityExceeds")),
    ).not.toHaveLength(0);
    expect(
      screen
        .getAllByRole("button", { name: t("done"), includeHidden: true })
        .find((button) => button.hasAttribute("disabled")),
    ).toBeDisabled();
    await expectCurrentScreenshot("claim-error-sheet");
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Bread" })).not.toBeInTheDocument();
    });
    await expectCurrentScreenshot("claim-error-after-close");
  });

  it("renders participant balances and item breakdown in summary mode", async () => {
    // Arrange
    summaryQueryValue = "1";

    // Act
    await renderReceiptFormInner({
      receipt: summaryBalancedReceipt,
      participants: splittingParticipants,
    });

    // Assert
    expect(screen.getByText("Ivan")).toBeInTheDocument();
    expect(screen.getByText("Anton")).toBeInTheDocument();
    expect(screen.getByText("Polina")).toBeInTheDocument();
    expect(screen.getAllByText("Milk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bread").length).toBeGreaterThan(0);
    expect(screen.getByText("1 × 801 ₽")).toBeInTheDocument();
    expect(screen.getAllByText("1 × 150 ₽").length).toBeGreaterThan(1);
    expect(screen.queryByText(new RegExp(`${t("remaining")}:`))).not.toBeInTheDocument();
    await expectCurrentScreenshot("summary-balances");
  });

  it("shows remaining indicator in summary mode when the receipt is not fully distributed", async () => {
    // Arrange
    summaryQueryValue = "1";

    // Act
    await renderReceiptFormInner({
      receipt: summaryRemainingReceipt,
      participants: splittingParticipants,
    });

    // Assert
    expect(screen.getByText(remainingText("370 ₽"))).toBeInTheDocument();
    expect(screen.queryByText("Polina")).not.toBeInTheDocument();
    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
    await expectCurrentScreenshot("summary-remaining");
  });

  it("falls back from summary to validation when a server update makes the receipt invalid", async () => {
    // Arrange
    summaryQueryValue = "1";
    const harness = await renderReceiptFormHarness({
      receipt: validReceipt,
      echoReceiptUpdates: false,
    });

    // Act
    await act(async () => {
      harness.pushReceipt?.(invalidReceipt);
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("search") })).toBeInTheDocument();
    });
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.queryByText(t("noClaims"))).not.toBeInTheDocument();
    await expectCurrentScreenshot("summary-fallback-to-validation");
  });

  it("updates the summary UI after a server receipt update", async () => {
    // Arrange
    summaryQueryValue = "1";
    const harness = await renderReceiptFormHarness({
      receipt: summaryBalancedReceipt,
      participants: splittingParticipants,
      echoReceiptUpdates: false,
    });

    // Act
    await act(async () => {
      harness.pushReceipt?.(summaryRemainingReceipt);
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(remainingText("370 ₽"))).toBeInTheDocument();
    });
    expect(screen.queryByText("Polina")).not.toBeInTheDocument();
    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
    await expectCurrentScreenshot("summary-live-update-remaining");
  });
});
