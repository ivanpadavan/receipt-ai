import { db } from "@/app/db";
import { Receipt } from "@/model/receipt/model";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ReceiptForm } from "../components/ReceiptForm";
import { buildParticipants } from "@/app/db-utils/build-participants";

// This is a server component that fetches the receipt data from the database
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch the receipt from the database
  const [receipt, participants] = await Promise.all([
    db.receipt.findUnique({ where: { id } }),
    buildParticipants(id).catch(() => 'fail' as const)
  ]);

  // Check if the receipt exists and belongs to the user
  if (!receipt || participants === 'fail') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
            Receipt Not Found
          </h1>
          <p className="text-center mb-6 text-muted-foreground">
            The receipt you are looking for does not exist or you do not have permission to view it.
          </p>
          <div className="flex justify-center">
            <Link href="/">
              <Button className="font-bold py-2 px-4 rounded-full shadow-md">
                Return to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ReceiptForm initialData={{ receipt: receipt.data as Receipt, participants }} receiptId={id} />
  );
}
