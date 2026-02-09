import { db } from "@/app/db";
import { getUser } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Receipt } from "@/model/receipt/model";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/app/i18n/translations";
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const historyShellVariants = cva("bg-amber-50");
const historyTitleVariants = cva("text-3xl font-bold text-amber-800");
const emptyCardTextVariants = cva("text-center");
const ctaButtonVariants = cva(
  "rounded-full bg-amber-500 px-4 py-2 font-bold text-white shadow-md hover:bg-amber-600",
);
const receiptCardVariants = cva("border-amber-200 hover:border-amber-400");
const receiptTitleVariants = cva("text-lg font-semibold text-amber-800");
const receiptDateVariants = cva("text-sm text-amber-600");
const receiptMetaVariants = cva("text-sm text-amber-700");
const receiptTotalVariants = cva("font-medium");

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
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 gap-4",
        historyShellVariants(),
      )}
    >
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className={historyTitleVariants()}>
            {t("receiptHistory")}
          </h1>
        </div>

        {receipts.length === 0 ? (
          <Card
            variant="warning"
            shadow="md"
            className={cn("w-full", emptyCardTextVariants())}
          >
            <CardContent className="p-6">
              <p className="mb-4">
                {t("noReceiptsYet")}
              </p>
              <Link href="/">
                <Button className={ctaButtonVariants()}>
                  {t("scanFirstReceipt")}
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
                    className={cn("w-full p-4", receiptCardVariants())}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className={receiptTitleVariants()}>
                        {t("receipt")} #{receipt.id.slice(-6)}
                      </h2>
                      <span className={receiptDateVariants()}>
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={cn("flex justify-between", receiptMetaVariants())}>
                      <span>
                        {itemCount} {itemCount === 1 ? t("itemSingle") : t("itemPlural")}
                      </span>
                      <span className={receiptTotalVariants()}>
                        ${totalAmount.toFixed(2)}
                      </span>
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
