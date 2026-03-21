ALTER TABLE "public"."ReceiptChat"
ADD COLUMN "userId" UUID;

UPDATE "public"."ReceiptChat" AS rc
SET "userId" = r."userId"
FROM "public"."Receipt" AS r
WHERE r."id" = rc."receiptId";

ALTER TABLE "public"."ReceiptChat"
ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "public"."ReceiptChat"
DROP CONSTRAINT "ReceiptChat_pkey";

ALTER TABLE "public"."ReceiptChat"
ADD CONSTRAINT "ReceiptChat_pkey" PRIMARY KEY ("receiptId", "userId");

CREATE INDEX "ReceiptChat_receiptId_idx"
ON "public"."ReceiptChat"("receiptId");

CREATE INDEX "ReceiptChat_userId_idx"
ON "public"."ReceiptChat"("userId");

ALTER TABLE "public"."ReceiptChat"
ADD CONSTRAINT "ReceiptChat_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "auth"."users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
