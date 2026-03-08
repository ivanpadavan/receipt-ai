import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { page } from "vitest/browser";
import userEvent from "@testing-library/user-event";
import { ParticipantsStoreProvider } from "@/app/receipt/store/participants";
import { Receipt, ReceiptWithParticipants } from "@/model/receipt/model";
import { cleanup, render, type RenderResult as BrowserRenderResult } from "vitest-browser-react";

const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;

let browserScreen: BrowserRenderResult | null = null;

function getActiveBrowserScreen() {
  if (!browserScreen) {
    throw new Error("browser screen is not initialized");
  }
  return browserScreen;
}

function queryBrowserDisplayValue(value: string) {
  const root = getActiveBrowserScreen().baseElement;
  return Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  ).find((element) => element.value === value) ?? null;
}

const screen = {
  getByText(text: string | RegExp) {
    return getActiveBrowserScreen().getByText(text).element() as HTMLElement;
  },
  queryByText(text: string | RegExp) {
    return getActiveBrowserScreen().getByText(text).query() as HTMLElement | null;
  },
  getAllByText(text: string | RegExp) {
    return getActiveBrowserScreen()
      .getByText(text)
      .all()
      .map((locator) => locator.element() as HTMLElement);
  },
  async findAllByText(text: string | RegExp) {
    const locator = getActiveBrowserScreen().getByText(text);
    await expect.poll(() => locator.length).toBeGreaterThan(0);
    return locator.all().map((item) => item.element() as HTMLElement);
  },
  getByRole(role: string, options?: Record<string, unknown>) {
    return getActiveBrowserScreen().getByRole(role, options).element() as HTMLElement;
  },
  queryByRole(role: string, options?: Record<string, unknown>) {
    return getActiveBrowserScreen().getByRole(role, options).query() as HTMLElement | null;
  },
  async findByRole(role: string, options?: Record<string, unknown>) {
    const locator = getActiveBrowserScreen().getByRole(role, options);
    await expect.element(locator).toBeInTheDocument();
    return locator.element() as HTMLElement;
  },
  getAllByRole(role: string, options?: Record<string, unknown>) {
    return getActiveBrowserScreen()
      .getByRole(role, options)
      .all()
      .map((locator) => locator.element() as HTMLElement);
  },
  async findAllByRole(role: string, options?: Record<string, unknown>) {
    const locator = getActiveBrowserScreen().getByRole(role, options);
    await expect.poll(() => locator.length).toBeGreaterThan(0);
    return locator.all().map((item) => item.element() as HTMLElement);
  },
  getByDisplayValue(value: string) {
    const element = queryBrowserDisplayValue(value);
    if (!element) throw new Error(`Unable to find display value "${value}"`);
    return element;
  },
  async findByDisplayValue(value: string) {
    await expect.poll(() => queryBrowserDisplayValue(value)).not.toBeNull();
    return queryBrowserDisplayValue(value)!;
  },
};

const useUserMock = vi.fn();
const pushMock = vi.fn();
const setSummaryQueryMock = vi.fn();
const updateReceiptMock = vi.fn();
let summaryQueryValue: string | null = null;

vi.mock("@/context/AuthContext", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("nuqs", () => ({
  useQueryState: () => [summaryQueryValue, setSummaryQueryMock],
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/app/api-client", () => ({
  apiClient: {
    createReceipt: vi.fn(),
    updateReceipt: (...args: unknown[]) => updateReceiptMock(...args),
  },
}));

const validReceipt: Receipt = {
  positions: [
    {
      id: "pos-milk",
      name: "Milk",
      quantity: 1,
      price: 801,
      overall: 801,
      claims: [],
    },
    {
      id: "pos-bread",
      name: "Bread",
      quantity: 2,
      price: 150,
      overall: 300,
      claims: [],
    },
    {
      id: "pos-butter",
      name: "Butter",
      quantity: 1,
      price: 220,
      overall: 220,
      claims: [],
    },
  ],
  totals: {
    total: 1321,
    grandTotal: 1321,
  },
  fees: [],
  discounts: [],
};

const joinedParticipants: ReceiptWithParticipants["participants"] = [
  {
    id: "user-1",
    displayName: "Ivan",
    color: "#111111",
    kind: "REAL",
    isAnonymous: false,
    isOnline: true,
  },
];

const invalidReceipt: Receipt = {
  ...validReceipt,
  totals: {
    total: 9999,
    grandTotal: 9999,
  },
};

const invalidNameReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      ...validReceipt.positions[0],
      name: "",
    },
    ...validReceipt.positions.slice(1),
  ],
};

const invalidZeroPositionReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      id: "pos-zero",
      name: "",
      quantity: 0,
      price: 0,
      overall: 0,
      claims: [],
    },
    ...validReceipt.positions,
  ],
};

const overClaimedReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "claim-1",
          participantIds: ["user-1"],
          type: "quantity",
          value: 2,
        },
      ],
    },
    validReceipt.positions[0],
    validReceipt.positions[2],
  ],
};

async function renderReceiptFormInner({
  receipt = validReceipt,
  participants = joinedParticipants,
}: {
  receipt?: Receipt;
  participants?: ReceiptWithParticipants["participants"];
} = {}) {
  const { ReceiptFormInner } = await import("@/app/receipt/components/ReceiptForm");
  const ui = (
    <ParticipantsStoreProvider initialParticipants={participants}>
      <ReceiptFormInner
        receipt={receipt}
        participants={participants}
        receiptId="receipt-1"
      />
    </ParticipantsStoreProvider>
  );

  browserScreen = await render(ui);
  return browserScreen;
}

async function renderReceiptFormHarness({
  receipt = validReceipt,
  participants = joinedParticipants,
  echoReceiptUpdates = true,
}: {
  receipt?: Receipt;
  participants?: ReceiptWithParticipants["participants"];
  echoReceiptUpdates?: boolean;
} = {}) {
  const { ReceiptFormInner } = await import("@/app/receipt/components/ReceiptForm");
  const controls: { pushReceipt?: (nextReceipt: Receipt) => void } = {};

  const ReceiptFormHarness: React.FC = () => {
    const [currentReceipt, setCurrentReceipt] = React.useState(receipt);
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
      <ParticipantsStoreProvider initialParticipants={participants}>
        <ReceiptFormInner
          receipt={currentReceipt}
          participants={participants}
          receiptId="receipt-1"
        />
      </ParticipantsStoreProvider>
    );
  };

  return {
    ...(browserScreen = await render(<ReceiptFormHarness />)),
    pushReceipt: (nextReceipt: Receipt) => controls.pushReceipt?.(nextReceipt),
  };
}

function getSearchButton() {
  return screen
    .getAllByRole("button")
    .find((button) => button.getAttribute("aria-label") === "Search")!;
}

function getCloseSearchButton() {
  return screen
    .getAllByRole("button")
    .find((button) => button.getAttribute("aria-label") === "Close search")!;
}

function getPositionButtonByText(fragment: string) {
  return screen.getAllByRole("button").find((button) =>
    button.textContent?.includes(fragment),
  );
}

function getZeroPositionButton() {
  return screen.getAllByRole("button").find(
    (button) =>
      button.textContent?.includes("0 ₽") &&
      button.textContent?.includes("0x"),
  );
}

async function openSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getSearchButton());
  return screen.findByRole("textbox");
}

async function expectCurrentScreenshot() {
  await expect
    .element(page.elementLocator(document.body))
    .toMatchScreenshot();
}

describe("Receipt flow", () => {
  beforeEach(async () => {
    await page.viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    vi.clearAllMocks();
    vi.resetModules();
    summaryQueryValue = null;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      "test-publishable-key",
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY =
      "test-publishable-key";
    useUserMock.mockReturnValue({
      user: {
        id: "user-1",
        user_metadata: {
          displayName: "Ivan",
        },
      },
    });
    updateReceiptMock.mockResolvedValue(validReceipt);
  });

  afterEach(async () => {
    browserScreen = null;
    vi.unstubAllEnvs();
    await cleanup();
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
    expect(screen.getByText("Чек")).toBeInTheDocument();
    expect(positions).toHaveLength(3);
    expect(screen.getByText("Итого:")).toBeInTheDocument();
    expect(screen.getByText("С учетом скидок и сборов:")).toBeInTheDocument();
    expect(getSearchButton()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Участники" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Готово" })).toBeInTheDocument();
    expect(screen.queryByText("Настройки")).not.toBeInTheDocument();
    await expectCurrentScreenshot();
  });

  it("starts invalid receipts in review mode with disabled proceed", async () => {
    // Arrange
    await renderReceiptFormInner({ receipt: invalidReceipt });

    // Act
    const reviewAction = screen.getByRole("button", { name: "Изменить" });

    // Assert
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(getSearchButton()).toBeInTheDocument();
    expect(reviewAction).toBeDisabled();
    await expectCurrentScreenshot();
  });

  it("renders summary mode from the query state and hides search", async () => {
    // Arrange
    summaryQueryValue = "1";

    // Act
    await renderReceiptFormInner();

    // Assert
    expect(screen.queryByText("Чек")).not.toBeInTheDocument();
    expect(screen.getByText("Пока нет распределений")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Изменить" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
    await expectCurrentScreenshot();
  });

  it("writes summary query when proceeding from splitting", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    await user.click(screen.getByRole("button", { name: "Готово" }));

    // Assert
    expect(setSummaryQueryMock).toHaveBeenCalledWith("1", {
      history: "push",
      scroll: true,
    });
    await expectCurrentScreenshot();
  });

  it("clears summary query when returning from summary", async () => {
    // Arrange
    const user = userEvent.setup();
    summaryQueryValue = "1";
    await renderReceiptFormInner();

    // Act
    await user.click(screen.getByRole("button", { name: "Изменить" }));

    // Assert
    expect(setSummaryQueryMock).toHaveBeenCalledWith(null, {
      history: "push",
      scroll: true,
    });
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
  });

  it("shows empty state for unmatched search while keeping totals visible", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();

    // Act
    const searchInput = await openSearch(user);
    await user.type(searchInput, "zzz");

    // Assert
    expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    expect(screen.getByText("Итого:")).toBeInTheDocument();
    expect(screen.getByText("С учетом скидок и сборов:")).toBeInTheDocument();
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
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
    expect(screen.queryByText("Ничего не найдено")).not.toBeInTheDocument();
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
  });

  it("keeps the filtered search state when opening splitting sheet", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await user.click(screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Milk") && button.textContent?.includes("801 ₽")
    )!);

    // Assert
    expect(screen.getByRole("heading", { name: "Milk" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("milk")).toBeInTheDocument();
    expect(screen.getAllByText("Milk").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();
    await expectCurrentScreenshot();
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
      expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
    });
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    expect(screen.queryByText("Tea")).not.toBeInTheDocument();
    await expectCurrentScreenshot();
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
    await expectCurrentScreenshot();
  });

  it("keeps the filtered search state when opening participants sheet", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner();
    const searchInput = await openSearch(user);
    await user.type(searchInput, "milk");

    // Act
    await user.click(screen.getByRole("button", { name: "Участники" }));

    // Assert
    expect(screen.getByRole("heading", { name: "Участники" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("milk")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
    await expectCurrentScreenshot();
  });

  it("opens position editing in validation mode with save disabled for an invalid name", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: invalidNameReceipt });

    // Act
    await user.click(screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("801 ₽") && button.textContent?.includes("x")
    )!);

    // Assert
    expect(await screen.findByDisplayValue("")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    await expectCurrentScreenshot();
  });

  it("removes an invalid zero-zero position and reaches a valid state after the server confirms deletion", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({
      receipt: invalidZeroPositionReceipt,
      echoReceiptUpdates: false,
    });
    expect(screen.getByRole("button", { name: "Изменить" })).toBeDisabled();

    // Act
    await user.click(getZeroPositionButton()!);
    await user.click(screen.getByRole("button", { name: "Удалить" }));
    await act(async () => {
      harness.pushReceipt?.(structuredClone(invalidZeroPositionReceipt));
    });
    await act(async () => {
      harness.pushReceipt?.(validReceipt);
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Готово" })).toBeEnabled();
    });
    expect(getZeroPositionButton()).toBeUndefined();
    await expectCurrentScreenshot();
  });

  it("does not resurrect a removed invalid zero-zero position when the next server update already reflects the deletion", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({
      receipt: invalidZeroPositionReceipt,
      echoReceiptUpdates: false,
    });

    // Act
    await user.click(getZeroPositionButton()!);
    await user.click(screen.getByRole("button", { name: "Удалить" }));
    await act(async () => {
      harness.pushReceipt?.(structuredClone(invalidZeroPositionReceipt));
    });
    await act(async () => {
      harness.pushReceipt?.(validReceipt);
    });

    // Assert
    await waitFor(() => {
      expect(getZeroPositionButton()).toBeUndefined();
    });
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    await expectCurrentScreenshot();
  });

  it("opens totals editing in validation mode with invalid values prefilled and save disabled", async () => {
    // Arrange
    const user = userEvent.setup();
    await renderReceiptFormInner({ receipt: invalidReceipt });

    // Act
    await user.click(screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Итого:") && button.textContent?.includes("9999 ₽")
    )!);

    // Assert
    const totalInputs = await screen.findAllByRole("spinbutton");
    expect(totalInputs[0]).toHaveValue(9999);
    expect(totalInputs[1]).toHaveValue(9999);
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    await expectCurrentScreenshot();
  });

  it("transitions from invalid to valid after editing totals", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({ receipt: invalidReceipt });
    expect(screen.getByRole("button", { name: "Изменить" })).toBeDisabled();

    // Act
    await user.click(screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Итого:") && button.textContent?.includes("9999 ₽")
    )!);

    const totalInputs = await screen.findAllByRole("spinbutton");
    await user.clear(totalInputs[0]);
    await user.type(totalInputs[0], "1321");
    await user.clear(totalInputs[1]);
    await user.type(totalInputs[1], "1321");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    harness.pushReceipt?.(validReceipt);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Готово" })).toBeEnabled();
    });
    expect(screen.getByText("Итого:")).toBeInTheDocument();
    expect(screen.getAllByText("1321 ₽").length).toBeGreaterThan(0);
    await expectCurrentScreenshot();
  });

  it("transitions from invalid to valid after editing a position", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({ receipt: invalidNameReceipt });
    expect(screen.getByRole("button", { name: "Изменить" })).toBeDisabled();

    // Act
    await user.click(screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("801 ₽") && button.textContent?.includes("x")
    )!);

    const nameInput = await screen.findByDisplayValue("");
    await user.type(nameInput, "Milk");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    harness.pushReceipt?.(validReceipt);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Готово" })).toBeEnabled();
    });
    expect(screen.getByText("Milk")).toBeInTheDocument();
    await expectCurrentScreenshot();
  });

  it("keeps claim error after shrinking a claimed position below distributed quantity", async () => {
    // Arrange
    const user = userEvent.setup();
    const harness = await renderReceiptFormHarness({ receipt: overClaimedReceipt });

    const breadRowButton = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Bread")
    );

    if (!breadRowButton) {
      throw new Error('bread row button should be here')
    }

    // Act
    await user.click(breadRowButton);
    await user.click(screen.getAllByRole("button", { name: "Редактировать" })[0]);

    const quantityInput = screen.getAllByRole("spinbutton")[1];
    await user.clear(quantityInput);
    await user.type(quantityInput, "1");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    // Assert
    expect(
      await screen.findAllByText("Распределенное количество больше количества позиции"),
    ).not.toHaveLength(0);
    expect(
      screen
        .getAllByRole("button", { name: "Готово", includeHidden: true })
        .find((button) => button.hasAttribute("disabled")),
    ).toBeDisabled();
    await expectCurrentScreenshot();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Bread" })).not.toBeInTheDocument();
    });
    await expectCurrentScreenshot();
  });
});
