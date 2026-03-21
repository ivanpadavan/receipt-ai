import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const withStructuredOutputMock = vi.fn(() => ({
  invoke: invokeMock,
}));

const uploadMock = vi.fn();
const createMock = vi.fn();
const errorWrapMock = vi.fn();
const validateReceiptBusinessMock = vi.fn();
const getReceiptBusinessValidationIssuesMock = vi.fn();
const formatReceiptBusinessValidationIssuesMock = vi.fn();

vi.mock("@langchain/openrouter", () => ({
  ChatOpenRouter: vi.fn(function ChatOpenRouter() {
    return {
      withStructuredOutput: withStructuredOutputMock,
    };
  }),
}));

vi.mock("@/app/db", () => ({
  db: {
    receipt: {
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

vi.mock("@/utils/supabase/server", () => ({
  serverSupabase: async () => ({
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => uploadMock(...args),
      }),
    },
  }),
}));

vi.mock("@/app/api/receipt/error-wrap", () => ({
  errorWrap: (...args: unknown[]) => errorWrapMock(...args),
}));

vi.mock("@/app/i18n/translations", () => ({
  t: (key: string) => key,
  withLanguage: (_language: string, callback: () => unknown) => callback(),
}));

vi.mock("@/model/receipt/business-validation", () => ({
  validateReceiptBusiness: (...args: unknown[]) =>
    validateReceiptBusinessMock(...args),
  getReceiptBusinessValidationIssues: (...args: unknown[]) =>
    getReceiptBusinessValidationIssuesMock(...args),
  formatReceiptBusinessValidationIssues: (...args: unknown[]) =>
    formatReceiptBusinessValidationIssuesMock(...args),
}));

describe("POST /api/receipt", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    withStructuredOutputMock.mockClear();
    uploadMock.mockReset();
    createMock.mockReset();
    errorWrapMock.mockReset();
    validateReceiptBusinessMock.mockReset();
    getReceiptBusinessValidationIssuesMock.mockReset();
    formatReceiptBusinessValidationIssuesMock.mockReset();
    validateReceiptBusinessMock.mockReturnValue({ success: true });
    getReceiptBusinessValidationIssuesMock.mockReturnValue([]);
    formatReceiptBusinessValidationIssuesMock.mockReturnValue("");
  });

  it("stores uploaded image paths in imageUrls", async () => {
    const receiptData = {
      meta: {
        title: "Receipt",
        currencySymbol: "₽",
      },
      positions: [
        {
          name: "Milk",
          price: 100,
          quantity: 1,
          overall: 100,
        },
      ],
      fees: [],
      discounts: [],
      totals: {
        total: 100,
        grandTotal: 100,
      },
    };

    uploadMock.mockResolvedValue({
      data: {
        path: "user-1/receipt-1.png",
        fullPath: "receipts/user-1/receipt-1.png",
      },
      error: null,
    });
    invokeMock.mockResolvedValue(receiptData);
    createMock.mockResolvedValue({ id: "receipt-1" });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "user-1" } },
          body: {
            images: [
              "data:image/png;base64,aGVsbG8=",
            ],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = await POST(
      new NextRequest("http://localhost/api/receipt", {
        method: "POST",
        body: JSON.stringify({
          images: ["data:image/png;base64,aGVsbG8="],
        }),
      }),
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        imageUrls: ["receipts/user-1/receipt-1.png"],
        data: {
          meta: {
            title: "Receipt",
            currencySymbol: "₽",
          },
          positions: [
            {
              id: expect.any(String),
              name: "Milk",
              price: 100,
              quantity: 1,
              overall: 100,
              claims: [],
            },
          ],
          fees: [],
          discounts: [],
          totals: {
            total: 100,
            grandTotal: 100,
          },
        },
      },
    });

    await expect(response.json()).resolves.toEqual({ id: "receipt-1" });
  });

  it("validates parsed receipt with shared business helper before persisting", async () => {
    const receiptData = {
      meta: {
        title: "Receipt",
        currencySymbol: "₽",
      },
      positions: [
        {
          name: "Milk",
          price: 100,
          quantity: 1,
          overall: 100,
        },
      ],
      fees: [],
      discounts: [],
      totals: {
        total: 100,
        grandTotal: 100,
      },
    };

    uploadMock.mockResolvedValue({
      data: {
        path: "user-1/receipt-1.png",
        fullPath: "receipts/user-1/receipt-1.png",
      },
      error: null,
    });
    invokeMock.mockResolvedValue(receiptData);
    createMock.mockResolvedValue({ id: "receipt-1" });
    errorWrapMock.mockImplementation(
      async (_req, _validator, callback: (...args: unknown[]) => unknown) =>
        callback({
          session: { user: { id: "user-1" } },
          body: {
            images: [
              "data:image/png;base64,aGVsbG8=",
            ],
          },
        }),
    );

    const { POST } = await import("../route");

    const response = await POST(
      new NextRequest("http://localhost/api/receipt", {
        method: "POST",
        body: JSON.stringify({
          images: ["data:image/png;base64,aGVsbG8="],
        }),
      }),
    );

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(getReceiptBusinessValidationIssuesMock).toHaveBeenCalledWith(receiptData);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        imageUrls: ["receipts/user-1/receipt-1.png"],
        data: {
          meta: {
            title: "Receipt",
            currencySymbol: "₽",
          },
          positions: [
            {
              id: expect.any(String),
              name: "Milk",
              price: 100,
              quantity: 1,
              overall: 100,
              claims: [],
            },
          ],
          fees: [],
          discounts: [],
          totals: {
            total: 100,
            grandTotal: 100,
          },
        },
      },
    });
    await expect(response.json()).resolves.toEqual({ id: "receipt-1" });
  });
});
