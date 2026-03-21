-- CreateTable
CREATE TABLE "ReceiptChat" (
    "receiptId" TEXT NOT NULL,
    "history" JSONB NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptChat_pkey" PRIMARY KEY ("receiptId")
);

-- AddForeignKey
ALTER TABLE "ReceiptChat" ADD CONSTRAINT "ReceiptChat_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
