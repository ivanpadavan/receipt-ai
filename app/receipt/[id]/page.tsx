import { db } from "@/app/db";
import { Receipt } from "@/model/receipt/model";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ReceiptForm } from "../components/ReceiptForm";
import { buildParticipants } from "@/app/db-utils/build-participants";
import { getUser } from "@/utils/supabase/server";
import { shouldAutoJoinReceipt } from "@/app/receipt/[id]/join-flow/rules";
import { joinReceiptServer } from "@/app/receipt/[id]/join-flow/join-receipt-server";

// This is a server component that fetches the receipt data from the database
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();

  // eslint-disable-next-line prefer-const
  let [receipt, participants] = await Promise.all([
    db.receipt.findUnique({ where: { id } }),
    buildParticipants(id),
  ]);

  // Check if the receipt exists and belongs to the user
  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
            Receipt Not Found
          </h1>
          <p className="text-center mb-6 text-muted-foreground">
            The receipt you are looking for does not exist or you do not have
            permission to view it.
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

  if (shouldAutoJoinReceipt(participants, user)) {
    await joinReceiptServer(id, user);
    participants = await buildParticipants(id);
  }

  return (
    <ReceiptForm
      initialData={{ receipt: receipt.data as Receipt, participants }}
      receiptId={id}
    />
  );
}
