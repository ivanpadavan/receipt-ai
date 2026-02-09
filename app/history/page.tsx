import { db } from "@/app/db";
import { getUser } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Receipt } from "@/model/receipt/model";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/app/i18n/translations";
import { cn } from "@/utils/cn";
import {
  cardPaddingVariants,
  historyCtaButtonVariants,
  historyEmptyCardTextVariants,
  historyReceiptCardVariants,
  screenShellVariants,
  textRoleVariants,
} from "@/app/receipt/components/ui-styles";

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
        screenShellVariants(),
      )}
    >
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1
            className={textRoleVariants({ role: "pageTitle" })}
          >
            {t("receiptHistory")}
          </h1>
        </div>

        {receipts.length === 0 ? (
          <Card
            variant="warning"
            shadow="md"
            className={cn("w-full", historyEmptyCardTextVariants())}
          >
            <CardContent className={cardPaddingVariants({ size: "lg" })}>
              <p className="mb-4">
                {t("noReceiptsYet")}
              </p>
              <Link href="/">
                <Button className={historyCtaButtonVariants()}>
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
                    className={cn(
                      "w-full",
                      historyReceiptCardVariants(),
                      cardPaddingVariants({ size: "md" }),
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h2
                        className={textRoleVariants({ role: "titleLgBrandStrong" })}
                      >
                        {t("receipt")} #{receipt.id.slice(-6)}
                      </h2>
                      <span
                        className={textRoleVariants({ role: "metaSmBrand" })}
                      >
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex justify-between",
                        textRoleVariants({ role: "metaSmBrandStrong" }),
                      )}
                    >
                      <span>
                        {itemCount} {itemCount === 1 ? t("itemSingle") : t("itemPlural")}
                      </span>
                      <span
                        className={textRoleVariants({ role: "metaSmBrandStrongEm" })}
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
