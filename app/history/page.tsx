import { db } from "@/app/db";
import { getUser } from "@/utils/supabase/server";
import { Receipt } from "@/model/receipt/model";
import { HistoryPageClient, HistoryReceiptCardModel } from "@/app/history/HistoryPage.client";

// export const runtime = 'edge';

export default async function HistoryPage() {
  // Get the user's session
  const user = await getUser();

  // Fetch the user's receipts from the database
  const receipts = await db.receipt.findMany({
    where: {
      OR: [
        {
          userId: user.id,
        },
        {
          realParticipants: {
            some: {
              userId: user.id,
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const cardModels: HistoryReceiptCardModel[] = receipts.map((receipt) => {
    const receiptData = receipt.data as unknown as Receipt;

    return {
      id: receipt.id,
      createdAt: receipt.createdAt instanceof Date
        ? receipt.createdAt.toISOString()
        : String(receipt.createdAt),
      itemCount: receiptData.positions.length,
      totalAmount: receiptData.totals.total,
    };
  });

  return <HistoryPageClient receipts={cardModels} />;
}
