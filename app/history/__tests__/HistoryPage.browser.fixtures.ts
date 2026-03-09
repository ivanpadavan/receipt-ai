import { HistoryReceiptCardModel } from "@/app/history/HistoryPage.client";

export const emptyHistoryReceipts: HistoryReceiptCardModel[] = [];

export const singleHistoryReceipt: HistoryReceiptCardModel[] = [
  {
    id: "receipt-73gne1",
    createdAt: "2026-03-07T10:00:00.000Z",
    itemCount: 11,
    totalAmount: 14339.5,
  },
];

export const multipleHistoryReceipts: HistoryReceiptCardModel[] = [
  ...singleHistoryReceipt,
  {
    id: "receipt-q7q9r6",
    createdAt: "2026-03-07T11:00:00.000Z",
    itemCount: 23,
    totalAmount: 14823.5,
  },
  {
    id: "receipt-ydjt27",
    createdAt: "2026-03-07T12:00:00.000Z",
    itemCount: 1,
    totalAmount: 520,
  },
];
