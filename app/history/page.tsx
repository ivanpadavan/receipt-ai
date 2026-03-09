import { db } from "@/app/db";
import { getUser } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Receipt } from "@/model/receipt/model";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/app/receipt/utils/formatMoney";
import {
  cardPaddingVariants,
  screenShell,
  rowVariants,
  stackGapVariants,
  textVariants,
  radiusTokens,
} from "@/app/receipt/components/ui-styles";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";

// ── History-scoped styles ──────────────────────────
const historyEmptyCardText = "text-center";
const historyCta =
  `${radiusTokens.full} bg-amber-500 px-4 py-2 font-bold text-white shadow-md hover:bg-amber-600`;

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

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        screenShell,
      )}
    >
      <div className="w-full max-w-md mx-auto">
        <div className={cn(rowVariants({ align: "center", justify: "between", width: "full" }), "mb-6")}>
          <h1
            className={textVariants({ size: "3xl", weight: "bold", tone: "brandStrong" })}
          >
            {t("receiptHistory")}
          </h1>
        </div>

        {receipts.length === 0 ? (
          <Card
            variant="warning"
            shadow="md"
            className={cn("w-full", historyEmptyCardText)}
          >
            <CardContent className={cardPaddingVariants({ size: "lg" })}>
              <p className="mb-4">
                {t("noReceiptsYet")}
              </p>
              <Link href="/">
                <Button className={historyCta}>
                  {t("scanFirstReceipt")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className={stackGapVariants({ size: "sm" })}>
            {receipts.map((receipt) => {
              // Parse the receipt data from JSON
              const receiptData = receipt.data as unknown as Receipt;

              // Calculate the total number of items
              const itemCount = receiptData.positions.length;

              // Get the total amount
              const totalAmount = receiptData.totals.total;

              return (
                <Link className="block" href={`/receipt/${receipt.id}`} key={receipt.id}>
                  <ReceiptCard
                    shadow="md"
                    interactive
                    className={cn(
                      "w-full",
                      cardPaddingVariants({ size: "md" }),
                    )}
                  >
                    <div className={cn(rowVariants({ align: "center", justify: "between", width: "full" }), "mb-2")}>
                      <h2
                        className={textVariants({ size: "lg", weight: "semibold", tone: "brandStrong" })}
                      >
                        {t("receipt")} #{receipt.id.slice(-6)}
                      </h2>
                      <span
                        className={textVariants({ size: "sm", tone: "brand" })}
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
                        className={textVariants({ size: "sm", weight: "medium", tone: "brandStrong" })}
                      >
                        {formatMoney(totalAmount)}
                      </span>
                    </div>
                  </ReceiptCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
