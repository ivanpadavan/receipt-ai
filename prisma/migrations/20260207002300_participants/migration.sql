-- CreateTable
CREATE TABLE "ReceiptUserParticipant" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptUserParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptMockParticipant" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptMockParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptUserParticipant_receiptId_userId_key" ON "ReceiptUserParticipant"("receiptId", "userId");

-- AddForeignKey
ALTER TABLE "ReceiptUserParticipant" ADD CONSTRAINT "ReceiptUserParticipant_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptUserParticipant" ADD CONSTRAINT "ReceiptUserParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptMockParticipant" ADD CONSTRAINT "ReceiptMockParticipant_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
