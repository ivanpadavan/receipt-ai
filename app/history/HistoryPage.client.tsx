"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
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

export interface HistoryReceiptCardModel {
  id: string;
  createdAt: string;
  itemCount: number;
  totalAmount: number;
}

export function HistoryPageClient({
  receipts,
}: {
  receipts: HistoryReceiptCardModel[];
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        screenShell,
      )}
    >
      <div className="w-full max-w-md mx-auto">
        <div
          className={cn(
            rowVariants({ align: "center", justify: "between", width: "full" }),
            "mb-6",
          )}
        >
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
            className={cn("w-full", historyEmptyCardText)}
          >
            <CardContent className={cardPaddingVariants({ size: "lg" })}>
              <p className="mb-4">{t("noReceiptsYet")}</p>
              <Link href="/">
                <Button className={historyCta}>{t("scanFirstReceipt")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className={stackGapVariants({ size: "sm" })}>
            {receipts.map((receipt) => {
              const createdAt = new Date(receipt.createdAt);
              const createdAtLabel = Number.isNaN(createdAt.getTime())
                ? receipt.createdAt
                : createdAt.toLocaleDateString();

              return (
                <ReceiptCard
                  asChild
                  key={receipt.id}
                  shadow="md"
                  interactive
                  className={cn("block w-full", cardPaddingVariants({ size: "md" }))}
                >
                  <Link href={`/receipt/${receipt.id}`}>
                    <div
                      className={cn(
                        rowVariants({
                          align: "center",
                          justify: "between",
                          width: "full",
                        }),
                        "mb-2",
                      )}
                    >
                      <h2
                        className={textVariants({
                          size: "lg",
                          weight: "semibold",
                          tone: "brandStrong",
                        })}
                      >
                        {t("receipt")} #{receipt.id.slice(-6)}
                      </h2>
                      <span className={textVariants({ size: "sm", tone: "brand" })}>
                        {createdAtLabel}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex justify-between",
                        textVariants({ size: "sm", tone: "brandStrong" }),
                      )}
                    >
                      <span>
                        {receipt.itemCount}{" "}
                        {receipt.itemCount === 1 ? t("itemSingle") : t("itemPlural")}
                      </span>
                      <span
                        className={textVariants({
                          size: "sm",
                          weight: "medium",
                          tone: "brandStrong",
                        })}
                      >
                        {formatMoney(receipt.totalAmount)}
                      </span>
                    </div>
                  </Link>
                </ReceiptCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
