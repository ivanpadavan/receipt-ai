import { db } from "@/app/db";
import { Receipt } from "@/model/receipt/model";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReceiptForm } from "../components/ReceiptForm";

// This is a server component that fetches the receipt data from the database
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch the receipt from the database
  const receipt = await db.receipt.findUnique({
    where: { id },
  });

  // Check if the receipt exists and belongs to the user
  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4 bg-amber-50">
        <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6 border border-amber-200">
          <h1 className="text-2xl font-bold mb-6 text-center text-amber-800">
            Receipt Not Found
          </h1>
          <p className="text-center mb-6 text-amber-700">
            The receipt you are looking for does not exist or you do not have permission to view it.
          </p>
          <div className="flex justify-center">
            <Link href="/">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full shadow-md">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Parse the receipt data from JSON
  const receiptData = receipt.data as unknown as Receipt;

  return (
    <ReceiptForm initialData={receiptData} receiptId={id} />
  );
}
