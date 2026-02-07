import { db } from "@/app/db";
import { getUser } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Receipt } from "@/model/receipt/model";
import { Card, CardContent } from "@/components/ui/card";

// export const runtime = 'edge';

export default async function HistoryPage() {
  // Get the user's session
  const user = await getUser();

  // Fetch the user's receipts from the database
  const receipts = await db.receipt.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-4 bg-amber-50">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-amber-800">Receipt History</h1>
        </div>

        {receipts.length === 0 ? (
          <Card
            variant="warning"
            shadow="md"
            className="w-full text-center"
          >
            <CardContent className="p-6">
              <p className="mb-4">
                You haven&apos;t scanned any receipts yet.
              </p>
              <Link href="/">
                <Button className="rounded-full bg-amber-500 px-4 py-2 font-bold text-white shadow-md hover:bg-amber-600">
                  Scan Your First Receipt
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => {
              // Parse the receipt data from JSON
              const receiptData = receipt.data as unknown as Receipt;

              // Calculate the total number of items
              const itemCount = receiptData.positions.length;

              // Get the total amount
              const totalAmount = receiptData.totals.total;

              return (
                <Link href={`/receipt/${receipt.id}`} key={receipt.id}>
                  <Card
                    variant="interactive"
                    shadow="md"
                    interactive
                    className="w-full border-amber-200 p-4 hover:border-amber-400"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-amber-800">
                        Receipt #{receipt.id.slice(-6)}
                      </h2>
                      <span className="text-sm text-amber-600">
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-amber-700">
                      <span>
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                      <span className="font-medium">${totalAmount.toFixed(2)}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
