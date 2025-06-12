import { db } from "@/app/db";
import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Receipt } from "@/model/receipt/model";

export default async function HistoryPage() {
  // Get the user's session
  const session = await auth();

  if (!session?.user) {
    // Redirect to sign-in page if not authenticated
    redirect("/auth/signin");
  }

  // Fetch the user's receipts from the database
  const receipts = await db.receipt.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-4 bg-amber-50">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-amber-800">
            Receipt History
          </h1>
          <Link href="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full shadow-md">
              Scan New
            </Button>
          </Link>
        </div>

        {receipts.length === 0 ? (
          <div className="w-full bg-white rounded-lg shadow-md p-6 border border-amber-200 text-center">
            <p className="text-amber-700 mb-4">You haven&apos;t scanned any receipts yet.</p>
            <Link href="/">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full shadow-md">
                Scan Your First Receipt
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => {
              // Parse the receipt data from JSON
              const receiptData = receipt.data as unknown as Receipt;

              // Calculate the total number of items
              const itemCount = receiptData.positions.length;

              // Get the total amount
              const totalAmount = receiptData.total.total;

              return (
                <Link href={`/receipt/${receipt.id}`} key={receipt.id}>
                  <div className="w-full bg-white rounded-lg shadow-md p-4 border border-amber-200 hover:border-amber-400 transition-colors cursor-pointer">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-lg font-semibold text-amber-800">
                        Receipt #{receipt.id.slice(-6)}
                      </h2>
                      <span className="text-sm text-amber-600">
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-amber-700">
                      <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                      <span className="font-medium">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
