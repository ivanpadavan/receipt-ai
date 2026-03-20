-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill legacy single-path values into the new array field.
UPDATE "Receipt"
SET "imageUrls" = CASE
    WHEN btrim(COALESCE("imageUrl", '')) = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY["imageUrl"]
END;

-- Drop temporary default after backfill; writes now provide the field explicitly.
ALTER TABLE "Receipt" ALTER COLUMN "imageUrls" DROP DEFAULT;

-- Drop legacy field.
ALTER TABLE "Receipt" DROP COLUMN "imageUrl";
