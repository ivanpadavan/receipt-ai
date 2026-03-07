import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HistoryPage from "@/app/history/page";

const { dbMock, getUserMock } = vi.hoisted(() => ({
  dbMock: {
    receipt: {
      findMany: vi.fn(),
    },
  },
  getUserMock: vi.fn(),
}));

vi.mock("@/app/db", () => ({
  db: dbMock,
}));

vi.mock("@/utils/supabase/server", () => ({
  getUser: () => getUserMock(),
}));

vi.mock("@/app/i18n/translations", () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      receiptHistory: "Receipt history",
      noReceiptsYet: "No receipts yet",
      scanFirstReceipt: "Scan first receipt",
      receipt: "Receipt",
      itemSingle: "item",
      itemPlural: "items",
    };
    return translations[key] || key;
  },
}));

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      id: "user-1",
    });
  });

  it("queries receipts where user is creator or participant", async () => {
    dbMock.receipt.findMany.mockResolvedValue([
      {
        id: "receipt-1",
        createdAt: new Date("2026-03-07T10:00:00.000Z"),
        data: {
          positions: [{ id: "pos-1" }],
          totals: { total: 100 },
        },
      },
    ]);

    render(await HistoryPage());

    expect(dbMock.receipt.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: "user-1" },
          {
            realParticipants: {
              some: {
                userId: "user-1",
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    expect(screen.getByText("Receipt #eipt-1")).toBeInTheDocument();
  });
});
