import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, waitFor } from "@testing-library/react";
import { page } from "vitest/browser";
import userEvent from "@testing-library/user-event";
import { setLanguage, t, type Language } from "@/app/i18n/translations";
import { formatMoney } from "@/app/receipt/utils/formatMoney";
import { ParticipantDTO, Receipt, ReceiptWithParticipants } from "@/model/receipt/model";
import { User } from "@supabase/supabase-js";
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
  receiptWithoutButterPosition,
  receiptWithModifiers,
  serverUpdatedMilkReceipt,
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
import { AppLayoutMock, defaultMockUser, pushMock } from "./AppLayout.mock";

let browserScreen: BrowserRenderResult | null = null;
let activeLanguage: Language = "en";

function getActiveBrowserScreen() {
  if (!browserScreen) {
    throw new Error("browser screen is not initialized");
  }
  return browserScreen;
}

const screen = createBrowserScreen(getActiveBrowserScreen);
const CURRENCY_SYMBOL = validReceipt.meta.currencySymbol;

function formatMoneyFromModel(value: number) {
  return formatMoney(value, CURRENCY_SYMBOL);
}

export const updateReceiptMock = vi.fn();
export const joinReceiptMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/app/api-client", () => ({
  apiClient: {
    createReceipt: vi.fn(),
    updateReceipt: (...args: unknown[]) => updateReceiptMock(...args),
    joinReceipt: (...args: unknown[]) => joinReceiptMock(...args),
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
  user,
  waitForInteractivity = true,
}: {
  receipt?: Receipt;
  participants?: ReceiptWithParticipants["participants"];
  user?: User;
  waitForInteractivity?: boolean;
} = {}) {
  const translations = await import("@/app/i18n/translations");
  translations.setLanguage(activeLanguage);
  const { ReceiptFormInner } = await import("@/app/receipt/components/ReceiptForm");
  const ui = (
    <AppLayoutMock participants={participants} user={user}>
      <ReceiptFormInner
        receipt={receipt}
        participants={participants}
        receiptId="receipt-1"
      />
    </AppLayoutMock>
  );

  browserScreen = await render(ui);
  if (waitForInteractivity) {
    await waitForDocumentInteractivity();
  }
  return browserScreen;
}

async function renderReceiptFormHarness({
  receipt = structuredClone(validReceipt),
  participants = structuredClone(joinedParticipants),
  echoReceiptUpdates = true,
  user,
  waitForInteractivity = true,
}: {
  receipt?: Receipt;
  participants?: ReceiptWithParticipants["participants"];
  echoReceiptUpdates?: boolean;
  user?: User;
  waitForInteractivity?: boolean;
} = {}) {
  const translations = await import("@/app/i18n/translations");
  translations.setLanguage(activeLanguage);
  const { ReceiptFormInner } = await import("@/app/receipt/components/ReceiptForm");
  const controls: {
    pushReceipt?: (nextReceipt: Receipt) => void;
    pushParticipants?: (nextParticipants: ReceiptWithParticipants["participants"]) => void;
  } = {};

  const ReceiptFormHarness: React.FC = () => {
    const [currentReceipt, setCurrentReceipt] = React.useState(receipt);
    const [currentParticipants, setCurrentParticipants] = React.useState(participants);
    // eslint-disable-next-line react-hooks/immutability
    controls.pushReceipt = setCurrentReceipt;
    // eslint-disable-next-line react-hooks/immutability
    controls.pushParticipants = setCurrentParticipants;

    React.useEffect(() => {
      updateReceiptMock.mockImplementation(async (_receiptId: string, nextReceipt: Receipt) => {
        if (echoReceiptUpdates) {
          setCurrentReceipt(nextReceipt);
        }
        return nextReceipt;
      });
    }, []);

    return (
      <AppLayoutMock participants={currentParticipants} user={user}>
        <ReceiptFormInner
          receipt={currentReceipt}
          participants={currentParticipants}
          receiptId="receipt-1"
        />
      </AppLayoutMock>
    );
  };

  browserScreen = await render(<ReceiptFormHarness />);
  if (waitForInteractivity) {
    await waitForDocumentInteractivity();
  }

  return {
    ...browserScreen,
    pushReceipt: (nextReceipt: Receipt) => controls.pushReceipt?.(nextReceipt),
    pushParticipants: (nextParticipants: ReceiptWithParticipants["participants"]) =>
      controls.pushParticipants?.(nextParticipants),
  };
}

function createMockUser(
  overrides: Partial<User> = {},
) {
  return {
    ...defaultMockUser,
    ...overrides,
    user_metadata: {
      ...(defaultMockUser.user_metadata as Record<string, unknown>),
      ...(overrides.user_metadata ?? {}),
    },
  } as User;
}

function createParticipant(
  overrides: Partial<ParticipantDTO> & Pick<ParticipantDTO, "id" | "displayName">,
): ParticipantDTO {
  return {
    id: overrides.id,
    displayName: overrides.displayName,
    color: overrides.color ?? "#111111",
    kind: overrides.kind ?? "REAL",
    isAnonymous: overrides.isAnonymous ?? false,
    isOnline: overrides.isOnline ?? true,
  };
}

async function createAvatarFixtureFile(name = "avatar.png") {
  const response = await fetch(new URL("./avatar.png", import.meta.url).href);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
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
      button.textContent?.includes(formatMoneyFromModel(0)) &&
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
        candidate.textContent?.includes(formatMoneyFromModel(0)) &&
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

async function openInvalidValidationPositionDialog(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(await findInteractiveButtonByFragments([formatMoneyFromModel(801), "x"]));
  const nameInput = await screen.findByDisplayValue("");
  const [priceInput, quantityInput, overallInput] = await screen.findAllByRole("spinbutton");
  return {
    nameInput,
    priceInput,
    quantityInput,
    overallInput,
  };
}

async function setPositionDraft(
  user: ReturnType<typeof userEvent.setup>,
  next: { name: string; price: string; quantity: string; overall: string },
) {
  const { nameInput, priceInput, quantityInput, overallInput } =
    await openInvalidValidationPositionDialog(user);

  await user.clear(nameInput);
  if (next.name !== "") {
    await user.type(nameInput, next.name);
  }

  await user.clear(priceInput);
  await user.type(priceInput, next.price);

  await user.clear(quantityInput);
  await user.type(quantityInput, next.quantity);

  await user.clear(overallInput);
  await user.type(overallInput, next.overall);
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
  return `${value}${t("pcs")}=${amount}${CURRENCY_SYMBOL}`;
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
    joinReceiptMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    browserScreen = null;
    vi.unstubAllEnvs();
    await cleanup();
    document.body.style.pointerEvents = "";
  });

  describe("Entry and mode transitions", () => {
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
    expect(screen.getByRole("heading", { name: validReceipt.meta.title })).toBeInTheDocument();
    expect(positions).toHaveLength(3);
    expect(screen.getAllByText(t("total")).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(formatMoneyFromModel(999)).length).toBeGreaterThan(0);
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
  });

  describe("Join flow", () => {
    it("auto-joins a recognized user with displayName in splitting mode", async () => {
      const user = createMockUser({
        id: "user-join-1",
        user_metadata: { displayName: "Anton" },
      });
      const participants = [createParticipant({ id: "p-1", displayName: "Polina" })];

      await renderReceiptFormInner({ user, participants, waitForInteractivity: false });

      await waitFor(() => {
        expect(joinReceiptMock).toHaveBeenCalledWith("receipt-1");
      });
      expect(screen.queryByRole("heading", { name: t("settings") })).not.toBeInTheDocument();
    });

    it("does not auto-join when user is already present in participants", async () => {
      const user = createMockUser({
        id: "user-join-2",
        user_metadata: { displayName: "Anton" },
      });
      const participants = [createParticipant({ id: "user-join-2", displayName: "Anton" })];

      await renderReceiptFormInner({ user, participants, waitForInteractivity: false });

      await waitFor(() => {
        expect(joinReceiptMock).not.toHaveBeenCalled();
      });
      expect(screen.queryByRole("heading", { name: t("settings") })).not.toBeInTheDocument();
    });

    it("opens settings step when displayName is missing and join is required", async () => {
      const user = createMockUser({
        id: "user-join-3",
        user_metadata: { displayName: undefined },
      });
      const participants = [createParticipant({ id: "p-1", displayName: "Polina" })];

      await renderReceiptFormInner({ user, participants, waitForInteractivity: false });

      expect(await screen.findByRole("heading", { name: t("settings") })).toBeInTheDocument();
      expect(joinReceiptMock).not.toHaveBeenCalled();
      await expectCurrentScreenshot("join-settings-open-when-display-name-missing");
    });

    it("shows offline anonymous candidates list in settings step", async () => {
      const user = createMockUser({
        id: "user-join-6",
        user_metadata: { displayName: undefined },
      });
      const participants = [
        createParticipant({
          id: "p-offline-anon-real",
          displayName: "Offline Anonymous",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        }),
      ];

      await renderReceiptFormInner({ user, participants, waitForInteractivity: false });

      expect(screen.getByText(t("alreadyParticipated"))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Offline Anonymous" })).toBeInTheDocument();
      await expectCurrentScreenshot("join-settings-shows-offline-anonymous-candidates");
    });

    it("hides candidates section when there are no offline anonymous candidates", async () => {
      const user = createMockUser({
        id: "user-join-7",
        user_metadata: { displayName: undefined },
      });
      const participants = [
        createParticipant({
          id: "p-online-anon-real",
          displayName: "Online Anonymous",
          kind: "REAL",
          isAnonymous: true,
          isOnline: true,
        }),
        createParticipant({
          id: "p-offline-named",
          displayName: "Offline Named",
          kind: "REAL",
          isAnonymous: false,
          isOnline: false,
        }),
        createParticipant({
          id: "p-offline-anon-mock",
          displayName: "Offline Mock",
          kind: "MOCK",
          isAnonymous: true,
          isOnline: false,
        }),
      ];

      await renderReceiptFormInner({ user, participants, waitForInteractivity: false });

      expect(screen.queryByText(t("alreadyParticipated"))).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Online Anonymous" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Offline Named" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Offline Mock" })).not.toBeInTheDocument();
    });

    it("keeps settings dialog open while join request is pending", async () => {
      const unresolved = new Promise<void>(() => undefined);
      joinReceiptMock.mockImplementation(() => unresolved);

      const user = userEvent.setup();
      const mockUser = createMockUser({
        id: "user-join-8",
        user_metadata: { displayName: undefined },
      });
      const participants = [createParticipant({ id: "p-1", displayName: "Polina" })];

      await renderReceiptFormInner({
        user: mockUser,
        participants,
        waitForInteractivity: false,
      });
      const displayNameInput = screen.getByRole("textbox");
      await user.clear(displayNameInput);
      await user.type(displayNameInput, "Anton");
      await expectCurrentScreenshot("can-join-when-name-is-typed");
      await user.click(screen.getByRole("button", { name: t("join") }));

      await waitFor(() => {
        expect(joinReceiptMock).toHaveBeenCalledWith("receipt-1", {
          profile: {
            avatarFile: undefined,
            avatarUrl: undefined,
            displayName: "Anton",
          },
        });
      });
      expect(screen.getByRole("heading", { name: t("settings") })).toBeInTheDocument();
      await expectCurrentScreenshot("join-settings-stays-open-while-request-pending");
    });

    it("closes settings dialog after successful profile submit", async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({
        id: "user-join-9",
        user_metadata: { displayName: undefined },
      });
      const participants = [createParticipant({ id: "p-1", displayName: "Polina" })];

      await renderReceiptFormInner({
        user: mockUser,
        participants,
        waitForInteractivity: false,
      });
      const displayNameInput = screen.getByRole("textbox");
      await user.clear(displayNameInput);
      await user.type(displayNameInput, " Anton ");
      await user.click(screen.getByRole("button", { name: t("join") }));

      await waitFor(() => {
        expect(joinReceiptMock).toHaveBeenCalledWith("receipt-1", {
          profile: {
            avatarFile: undefined,
            avatarUrl: undefined,
            displayName: "Anton",
          },
        });
      });
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: t("settings") })).not.toBeInTheDocument();
      });
    });

    it("joins as existing participant via candidate action for offline anonymous REAL", async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({
        id: "user-join-10",
        user_metadata: { displayName: undefined },
      });
      const participants = [
        createParticipant({
          id: "p-offline-anon-real",
          displayName: "Offline Anonymous",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        }),
      ];

      await renderReceiptFormInner({
        user: mockUser,
        participants,
        waitForInteractivity: false,
      });
      await user.click(screen.getByRole("button", { name: "Offline Anonymous" }));

      await waitFor(() => {
        expect(joinReceiptMock).toHaveBeenCalledWith("receipt-1", {
          replaceParticipantId: "p-offline-anon-real",
        });
      });
      await expectCurrentScreenshot("join-candidate-action-replaces-offline-anon-real");
    });

    it("keeps settings open while candidate replace request is pending", async () => {
      const unresolved = new Promise<void>(() => undefined);
      joinReceiptMock.mockImplementation(() => unresolved);

      const user = userEvent.setup();
      const mockUser = createMockUser({
        id: "user-join-10-pending",
        user_metadata: { displayName: undefined },
      });
      const participants = [
        createParticipant({
          id: "p-offline-anon-real-1",
          displayName: "Offline Anonymous 1",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        }),
        createParticipant({
          id: "p-offline-anon-real-2",
          displayName: "Offline Anonymous 2",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        }),
        createParticipant({
          id: "p-offline-anon-real-3",
          displayName: "Offline Anonymous 3",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        }),
        createParticipant({
          id: "p-offline-anon-real-4",
          displayName: "Offline Anonymous 4",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        }),
        createParticipant({
          id: "p-offline-anon-real-5",
          displayName: "Offline Anonymous 5",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        }),
      ];

      await renderReceiptFormInner({
        user: mockUser,
        participants,
        waitForInteractivity: false,
      });
      await user.click(screen.getByRole("button", { name: "Offline Anonymous 1" }));
      await waitFor(() => {
        expect(joinReceiptMock).toHaveBeenCalledWith("receipt-1", {
          replaceParticipantId: "p-offline-anon-real-1",
        });
      });
      expect(screen.getByRole("heading", { name: t("settings") })).toBeInTheDocument();
      await expectCurrentScreenshot("join-candidate-replace-pending");
    });

    it("shows removed state when participant was joined and then removed by server update", async () => {
      const mockUser = createMockUser({
        id: "user-join-11",
        user_metadata: { displayName: "Anton" },
      });
      const initialParticipants = [
        createParticipant({ id: "user-join-11", displayName: "Anton" }),
        createParticipant({ id: "p-1", displayName: "Polina" }),
      ];
      const { pushParticipants } = await renderReceiptFormHarness({
        user: mockUser,
        participants: initialParticipants,
        waitForInteractivity: false,
      });

      await act(async () => {
        pushParticipants?.([createParticipant({ id: "p-1", displayName: "Polina" })]);
      });

      await waitFor(() => {
        expect(screen.getByText(t("removedTitle"))).toBeInTheDocument();
      });
      expect(screen.getByText(t("removedBody"))).toBeInTheDocument();
      await expectCurrentScreenshot("join-removed-state-after-server-removal");
    });

    it("navigates home from removed state action", async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({
        id: "user-join-12",
        user_metadata: { displayName: "Anton" },
      });
      const initialParticipants = [
        createParticipant({ id: "user-join-12", displayName: "Anton" }),
        createParticipant({ id: "p-1", displayName: "Polina" }),
      ];
      const { pushParticipants } = await renderReceiptFormHarness({
        user: mockUser,
        participants: initialParticipants,
        waitForInteractivity: false,
      });

      await act(async () => {
        pushParticipants?.([createParticipant({ id: "p-1", displayName: "Polina" })]);
      });

      await user.click(screen.getByRole("button", { name: t("goHome") }));
      expect(pushMock).toHaveBeenCalledWith("/");
    });

    it("closes settings flow when server update makes user joined", async () => {
      const mockUser = createMockUser({
        id: "user-join-14",
        user_metadata: { displayName: undefined },
      });
      const initialParticipants = [createParticipant({ id: "p-1", displayName: "Polina" })];
      const { pushParticipants } = await renderReceiptFormHarness({
        user: mockUser,
        participants: initialParticipants,
        waitForInteractivity: false,
      });

      expect(await screen.findByRole("heading", { name: t("settings") })).toBeInTheDocument();

      await act(async () => {
        pushParticipants?.([
          createParticipant({ id: "p-1", displayName: "Polina" }),
          createParticipant({
            id: "user-join-14",
            displayName: "Anton",
            isAnonymous: true,
          }),
        ]);
      });

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: t("settings") })).not.toBeInTheDocument();
      });
    });

    it("walks through avatar upload flow with crop and submit screenshots", async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({
        id: "user-join-avatar-flow",
        user_metadata: { displayName: undefined },
      });
      const participants = [createParticipant({ id: "p-1", displayName: "Polina" })];

      await renderReceiptFormInner({
        user: mockUser,
        participants,
        waitForInteractivity: false,
      });

      await expectCurrentScreenshot("join-avatar-upload-settings-open");

      const uploadInput = requireElement(
        Array.from(document.querySelectorAll<HTMLInputElement>("input[type='file'][accept='image/*']"))
          .find((input) => !input.hasAttribute("capture")),
        "avatar upload input should be present",
      );
      const avatarFile = await createAvatarFixtureFile();
      await user.upload(uploadInput, avatarFile);

      expect(await screen.findByRole("heading", { name: t("cropAvatar") })).toBeInTheDocument();
      await expectCurrentScreenshot("join-avatar-upload-crop-open");

      const zoomSlider = requireElement(
        document.querySelector<HTMLInputElement>("input[type='range']"),
        "crop zoom slider should be present",
      );
      fireEvent.change(zoomSlider, { target: { value: "1.5" } });
      await expectCurrentScreenshot("join-avatar-upload-zoom-slider-used");
      await user.click(screen.getByRole("button", { name: t("save") }));

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: t("cropAvatar") })).not.toBeInTheDocument();
      });
      await expectCurrentScreenshot("join-avatar-upload-crop-applied");

      const displayNameInput = screen.getByRole("textbox");
      await user.clear(displayNameInput);
      await user.type(displayNameInput, "Avatar User");
      await user.click(screen.getByRole("button", { name: t("join") }));

      await waitFor(() => {
        expect(joinReceiptMock).toHaveBeenCalledWith("receipt-1", {
          profile: {
            avatarFile: expect.any(File),
            avatarUrl: expect.any(String),
            displayName: "Avatar User",
          },
        });
      });
      await expectCurrentScreenshot("join-avatar-upload-submit");
    });
  });

  describe("Search", () => {
    it("smoothly scrolls to the top when the user starts typing in search", async () => {
    // Arrange
    const user = userEvent.setup();
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    await renderReceiptFormInner();

    // Act
    const searchInput = await openSearch(user);
    await user.type(searchInput, "m");

    // Assert
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
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
    expect(screen.getAllByText(t("total")).length).toBeGreaterThan(0);
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
    await user.click(getInteractiveButtonByFragments(["Milk", formatMoneyFromModel(801)]));

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
  });

  describe("Splitting and claims", () => {
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
    expect(
      screen.getByText(
        `${2} ${t("pcs")} × ${formatMoneyFromModel(150)} =`,
      ),
    ).toBeInTheDocument();

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
    await user.click(getButtonByExactText(CURRENCY_SYMBOL));

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
    await user.click(getButtonByExactText(CURRENCY_SYMBOL));
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
    await user.click(getClaimButtonByText(`150${CURRENCY_SYMBOL}`));

    // Assert
    const maxButton = screen.getByRole("button", { name: t("max") });
    expect(maxButton).toHaveAttribute("aria-pressed", "true");

    // Act
    await user.click(getButtonByExactText(t("pcs")));

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
});

  describe("Action bar and modifiers", () => {
    it("opens the action bar add menu", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await user.click(getActionBarEditButton());

    // Assert
    expect(screen.getByRole("menuitem", { name: t("editReceipt") })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("addPosition") })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("addDiscount") })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("addFee") })).toBeInTheDocument();
    await expectCurrentScreenshot("action-bar-add-menu-open");
  });

  it("edits receipt name through editing dialog and updates the header", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await openActionBarMenuItem(user, t("editReceipt"));
    const nameInput = await screen.findByRole("textbox");
    await user.clear(nameInput);
    await user.type(nameInput, "ab");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
    });
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("option", { name: "$" });
    await expectCurrentScreenshot("receipt-name-editing-errors");
    await user.keyboard("{Escape}");
    await user.clear(nameInput);
    await user.type(nameInput, "Beer dinner");
    await expectCurrentScreenshot("receipt-name-editing");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Beer dinner" })).toBeInTheDocument();
    });
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
    expect(screen.getAllByText(formatMoneyFromModel(200)).length).toBeGreaterThan(0);
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
  });

  describe("Validation and recovery", () => {
    it("saves totals edits before the server echo arrives", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormHarness({ receipt: invalidReceipt, echoReceiptUpdates: false });

    // Act
    await user.click(await findInteractiveButtonByFragments([t("total"), formatMoneyFromModel(9999)]));

    const totalInputs = await screen.findAllByRole("spinbutton");
    await user.clear(totalInputs[0]);
    await user.type(totalInputs[0], "1321");
    await user.clear(totalInputs[1]);
    await user.type(totalInputs[1], "1321");
    await user.click(screen.getByRole("button", { name: t("save") }));

    // Assert
    await waitFor(() => {
      expect(screen.getAllByText(formatMoneyFromModel(1321)).length).toBeGreaterThan(0);
    });
    await expectCurrentScreenshot("validation-totals-optimistic");
  });

  it("opens position editing in validation mode with save disabled for an invalid name", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: invalidPositionAndTotalsReceipt });

    // Act
    await user.click(await findInteractiveButtonByFragments([formatMoneyFromModel(801), "x"]));

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
    await user.click(await findInteractiveButtonByFragments([formatMoneyFromModel(999), "x"]));

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
    await user.click(await findInteractiveButtonByFragments([t("total"), formatMoneyFromModel(9999)]));

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
    await user.click(await findInteractiveButtonByFragments([t("total"), formatMoneyFromModel(9999)]));

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
    expect(screen.getAllByText(t("total")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatMoneyFromModel(1321)).length).toBeGreaterThan(0);
    await expectCurrentScreenshot("validation-totals-fixed");
  });

  it("transitions from invalid to valid after editing a position", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({ receipt: invalidNameReceipt });
    expect(screen.getByRole("button", { name: t("done") })).toBeDisabled();

    // Act
    await user.click(await findInteractiveButtonByFragments([formatMoneyFromModel(801), "x"]));

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
  });

  describe("Server conflicts", () => {
    it("shows a modified conflict and applies server values when Use server is chosen", async () => {
      // Arrange
      const user = userEvent.setup();
      const harness = await renderReceiptFormHarness({
        receipt: invalidPositionAndTotalsReceipt,
        echoReceiptUpdates: false,
      });
      await setPositionDraft(user, {
        name: "",
        price: "-900",
        quantity: "-2",
        overall: "-1800",
      });
      expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();

      // Act
      await act(async () => {
        harness.pushReceipt?.(serverUpdatedMilkReceipt);
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(t("conflictItemModified")),
        ).toBeInTheDocument();
      });

      await expectCurrentScreenshot("server-update-conflict-use-server");

      await user.click(screen.getByRole("button", { name: t("useServer") }));
      await waitFor(() => {
        expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(777);
      });

      expect(screen.getByDisplayValue("Milk")).toBeInTheDocument();
      expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(777);
      expect(screen.getByRole("button", { name: t("save") })).toBeEnabled();
      expect(
        screen.queryByText(t("conflictItemModified")),
      ).not.toBeInTheDocument();
    });

    it("shows a modified conflict and keeps local draft when Keep mine is chosen", async () => {
      // Arrange
      const user = userEvent.setup();
      const harness = await renderReceiptFormHarness({
        receipt: invalidPositionAndTotalsReceipt,
        echoReceiptUpdates: false,
      });
      await setPositionDraft(user, {
        name: "Milk mine",
        price: "905",
        quantity: "1",
        overall: "905",
      });

      // Act
      await act(async () => {
        harness.pushReceipt?.(serverUpdatedMilkReceipt);
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(t("conflictItemModified")),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: t("keepMine") }));
      await waitFor(() => {
        expect(
          screen.queryByText(t("conflictItemModified")),
        ).not.toBeInTheDocument();
      });
      expect(screen.getByDisplayValue("Milk mine")).toBeInTheDocument();
      expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(905);
      expect(screen.getByRole("button", { name: t("save") })).toBeEnabled();
      expect(
        screen.queryByText(t("conflictItemModified")),
      ).not.toBeInTheDocument();
    });

    it("shows a deleted conflict and disables save when the edited row disappears on server update", async () => {
      // Arrange
      const user = userEvent.setup();
      const harness = await renderReceiptFormHarness({
        receipt: invalidPositionAndTotalsReceipt,
        echoReceiptUpdates: false,
      });
      await user.click(await findInteractiveButtonByFragments([formatMoneyFromModel(220), "x"]));
      await screen.findByDisplayValue("Butter");

      // Act
      await act(async () => {
        harness.pushReceipt?.(receiptWithoutButterPosition);
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(t("conflictItemDeleted")),
        ).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: t("save") })).toBeDisabled();
      await expectCurrentScreenshot("server-update-conflict-deleted");
    });

    it("auto-applies server updates for a pristine validation form", async () => {
      // Arrange
      const user = userEvent.setup();
      const harness = await renderReceiptFormHarness({
        receipt: invalidPositionAndTotalsReceipt,
        echoReceiptUpdates: false,
      });
      expect(screen.queryByText("Milk")).not.toBeInTheDocument();
      await user.click(await findInteractiveButtonByFragments([formatMoneyFromModel(801), "x"]));

      // Act
      await act(async () => {
        harness.pushReceipt?.(serverUpdatedMilkReceipt);
      });

      // Assert
      expect(screen.getByDisplayValue("Milk")).toBeInTheDocument();
      expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(777);
      expect(screen.getByRole("button", { name: t("save") })).toBeEnabled();
      expect(
        screen.queryByText(t("conflictItemModified")),
      ).not.toBeInTheDocument();
    });
  });

  describe("Summary", () => {
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
    expect(screen.getByText(`1 × ${formatMoneyFromModel(801)}`)).toBeInTheDocument();
    expect(screen.getAllByText(`1 × ${formatMoneyFromModel(150)}`).length).toBeGreaterThan(1);
    expect(screen.queryByText(t("remaining"))).not.toBeInTheDocument();
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
    expect(screen.getByText(remainingText(formatMoneyFromModel(370)))).toBeInTheDocument();
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
      expect(screen.getByText(remainingText(formatMoneyFromModel(370)))).toBeInTheDocument();
    });
    expect(screen.queryByText("Polina")).not.toBeInTheDocument();
    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
    await expectCurrentScreenshot("summary-live-update-remaining");
    });
  });
});
