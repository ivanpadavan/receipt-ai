# Receipt AI Project Documentation

## 1. Project Purpose

`receipt-ai` is a collaborative bill-splitting app.

Main product flow:
- User uploads a receipt photo.
- AI extracts structured receipt data.
- Users validate/edit receipt data.
- Participants split receipt positions.
- App shows final per-participant summary.

## 2. Tech Stack

- Framework: Next.js 16 (App Router), React 19, TypeScript.
- Styling/UI: Tailwind CSS, Radix UI (via local `components/ui/*`).
- Forms: React Hook Form.
- Validation: Zod.
- State: Zustand (`app/receipt/store/participants.ts`) and RxJS in join flow overlay.
- Database: PostgreSQL via Prisma.
- Auth + Realtime + Storage: Supabase.
- AI parsing: LangChain + Google Gemini (`GOOGLE_API_KEY`, `GOOGLE_API_MODEL`).
- Testing: Vitest + Testing Library.

## 3. High-Level Architecture

Main modules:
- `app/api/receipt/route.ts`: create receipt from image (AI parse + DB persist).
- `app/receipt/[id]/page.tsx`: server page that loads receipt + participants.
- `app/api/receipt/[id]/route.ts`: SSE stream and receipt update endpoint.
- `app/receipt/components/ReceiptForm.tsx`: main client UI for edit/split/summary modes.
- `app/receipt/[id]/useReceiptFormState.ts`: scenario logic (validation/editing/splitting/summary).
- `app/receipt/[id]/join-flow/*`: onboarding/join logic at receipt entry.
- `app/receipt/store/participants.ts`: current participants client store.

Data shape:
- Receipt JSON (`model/receipt/schema.ts`) contains positions, modifiers, totals, claims.
- Participants are stored in relational tables and delivered as DTOs.

## 4. Core User Flows

### 4.1 Create Receipt

Entry point:
- `POST /api/receipt` (`app/api/receipt/route.ts`)

What happens:
- Upload image to Supabase Storage (`receipts` bucket).
- Parse image with Gemini into structured schema.
- Retry AI correction up to 3 times if math validation fails.
- Save receipt JSON in `Receipt.data`.
- Auto-create owner participant in `ReceiptUserParticipant`.

### 4.2 Open Receipt Page

Entry point:
- `app/receipt/[id]/page.tsx`

What happens:
- Loads receipt and participants.
- Applies auto-join rule (`join-flow/rules.ts`) when allowed.
- Renders `ReceiptForm` with initial payload.

### 4.3 Realtime Sync

Entry point:
- `GET /api/receipt/[id]` (`app/api/receipt/[id]/route.ts`)

Payload:
- `{ receipt, participants }`

Updates are pushed on:
- `Receipt` row updates.
- `ReceiptUserParticipant` changes.
- `ReceiptMockParticipant` changes.

### 4.4 Join Flow (Split Entry)

Module:
- `app/receipt/[id]/join-flow/*`

Responsibilities:
- Decide whether user can proceed, must set name, or can auto-join.
- Trigger join API call for eligible users.
- Show settings-required dialog when `displayName` is missing.
- Show removed-from-receipt dialog when user is removed after being present.

### 4.5 Split + Summary

Main UI:
- `app/receipt/components/SplittingSheet/*`
- `app/receipt/components/SummaryScreen/*`

Behavior:
- Claims are assigned to participant IDs.
- Summary calculates per-participant amounts.
- Missing/deleted participants are ignored in totals in current calculation flow.

## 5. Data Model (Prisma)

File:
- `prisma/schema.prisma`

Main tables:
- `Receipt`
- `ReceiptUserParticipant` (real user relation, unique `(receiptId, userId)`)
- `ReceiptMockParticipant` (local/mock participant scoped to receipt)
- `auth.users` (Supabase auth schema)

## 6. API Surface

Receipt:
- `POST /api/receipt` create from image.
- `GET /api/receipt/[id]` SSE stream.
- `PUT /api/receipt/[id]` update receipt JSON.

Participants:
- `POST /api/receipt/[id]/participants/join` join real user.
- `POST /api/receipt/[id]/participants/mock` create mock participant.
- `PATCH /api/receipt/[id]/participants/mock/[participantId]` rename mock participant.
- `DELETE /api/receipt/[id]/participants/mock/[participantId]` delete mock participant.
- `DELETE /api/receipt/[id]/participants/real/[userId]` remove real participant relation.

Auth:
- `POST /api/auth/google`
- `POST /api/auth/auto-login`

## 7. Auth and User Metadata

Auth source:
- Supabase Auth (`context/AuthContext.tsx`, `utils/supabase/*`)

Important metadata fields:
- `displayName`
- `avatarUrl`

Current project policy:
- Treat `displayName` as a direct field.
- Do not add fallback heuristics unless explicitly requested.

## 8. State and Reactivity

Current practical split:
- `participants` list in Zustand store (`app/receipt/store/participants.ts`).
- SSE -> form/store sync in `ReceiptForm`.
- Join overlay uses RxJS stream composition in `join-flow/use-join-flow-overlay.tsx`.

## 9. Environment Variables

Required in practice:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SECRET_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_API_MODEL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `DATABASE_URL`
- `DIRECT_URL`

Note:
- `.env.example` exists but does not fully reflect current Supabase naming.

## 10. Local Development

Install:
```bash
pnpm install
```

Run dev:
```bash
pnpm dev
```

Build:
```bash
pnpm build
pnpm start
```

Tests:
```bash
pnpm test
```

Lint:
```bash
pnpm lint
```

## 11. Project Conventions

- See `AGENTS.md` and `WORKING-FIRST.md`.
- Focus on working behavior and verified outcomes.
- Keep diffs minimal and task-scoped.

## 12. Known Gaps / TODOs

From code comments and current behavior:
- No explicit UI handling when SSE disconnects (`ReceiptForm` TODO).
- `PUT /api/receipt/[id]` permission model is marked for improvement.
- `POST /api/receipt` contains a noted FIXME around image upload flow.
