import { db } from "@/app/db";
import { getUser } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Receipt } from "@/model/receipt/model";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/app/i18n/translations";
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";
import { radiusTokens, textVariants } from "@/app/receipt/components/ui-styles";

const historyShellVariants = cva("bg-amber-50 p-4");
const emptyCardTextVariants = cva("text-center");
const ctaButtonVariants = cva(
  `${radiusTokens.full} bg-amber-500 px-4 py-2 font-bold text-white shadow-md hover:bg-amber-600`,
);
const receiptCardVariants = cva("border-amber-200 hover:border-amber-400");
const emptyCardContentVariants = cva("p-6");
const receiptCardPaddingVariants = cva("p-4");

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
        "flex flex-col items-center justify-center gap-4",
        historyShellVariants(),
      )}
    >
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1
            className={textVariants({
              size: "3xl",
              weight: "bold",
              tone: "brandStrong",
            })}
          >
            {t("receiptHistory")}
          </h1>
        </div>

        {receipts.length === 0 ? (
          <Card
            variant="warning"
            shadow="md"
            className={cn("w-full", emptyCardTextVariants())}
          >
            <CardContent className={emptyCardContentVariants()}>
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
                    className={cn("w-full", receiptCardVariants(), receiptCardPaddingVariants())}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h2
                        className={textVariants({
                          size: "lg",
                          weight: "semibold",
                          tone: "brandStrong",
                        })}
                      >
                        {t("receipt")} #{receipt.id.slice(-6)}
                      </h2>
                      <span
                        className={textVariants({
                          size: "sm",
                          tone: "brand",
                        })}
                      >
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex justify-between",
                        textVariants({ size: "sm", tone: "brandStrong" }),
                      )}
                    >
                      <span>
                        {itemCount} {itemCount === 1 ? t("itemSingle") : t("itemPlural")}
                      </span>
                      <span
                        className={textVariants({
                          weight: "medium",
                          tone: "brandStrong",
                        })}
                      >
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
