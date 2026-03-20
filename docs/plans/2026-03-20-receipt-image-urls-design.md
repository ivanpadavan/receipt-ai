# Receipt Image URLs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `Receipt.imageUrl` with a proper multi-image `imageUrls` array while preserving existing receipt image paths during migration.

**Architecture:** Store receipt images in a Postgres `TEXT[]` column exposed through Prisma as `String[]`. Migrate existing rows by copying the legacy single string path into a one-element array, treating empty values as an empty array. Update the receipt create route to persist the array directly and keep the rest of the app unchanged.

**Tech Stack:** Prisma 7, PostgreSQL, Next.js route handlers, Vitest.

---

### Task 1: Update the Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Change the Receipt model**

Replace `imageUrl String` with `imageUrls String[]`.

**Step 2: Regenerate Prisma client**

Run: `pnpm prisma generate`

Expected: Prisma client reflects `imageUrls` in generated types.

### Task 2: Add the data migration

**Files:**
- Create: `prisma/migrations/20260320090000_receipt_image_urls/migration.sql`

**Step 1: Add the new array column**

Create `imageUrls TEXT[] NOT NULL` with a temporary empty-array default for backfill.

**Step 2: Copy legacy data**

Move the old `imageUrl` string into `imageUrls` as a one-element array, using an empty array for empty/null-like values.

**Step 3: Remove the old column**

Drop the legacy `imageUrl` column after the backfill completes.

### Task 3: Update the create route and verify behavior

**Files:**
- Modify: `app/api/receipt/route.ts`
- Add: `app/api/receipt/__tests__/route.test.ts`

**Step 1: Write the failing test**

Assert that receipt creation persists `imageUrls` and no longer writes `imageUrl`.

**Step 2: Update the route**

Write `imageUrls` directly into Prisma create data.

**Step 3: Run tests**

Run: `pnpm exec vitest 'app/api/receipt/__tests__/route.test.ts' 'app/api/receipt/[id]/chat/__tests__/route.test.ts' --run`

Expected: PASS

**Step 4: Run Prisma generate**

Run: `pnpm prisma generate`

Expected: PASS
