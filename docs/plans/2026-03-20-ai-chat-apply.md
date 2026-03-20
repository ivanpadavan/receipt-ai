# AI Chat Apply Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add transparent AI preview application flows for structural and claims previews, including diff UI, confirm steps, and safe application into the live receipt form.

**Architecture:** Keep AI chat as a preview-first flow. Structural previews continue to return a full structural receipt preview and apply directly into the existing RHF form while preserving existing claims where possible. Claims previews return only claim payload keyed by `positionId`; the client builds preview UI from current receipt + payload, offers `Add` and conditional `Replace all`, and expires the preview if referenced positions disappear.

**Tech Stack:** Next.js App Router, React 19, react-hook-form, Zod, Vitest, existing receipt form/store/ui components

---

### Task 1: Reshape AI chat contracts for applyable preview payloads

**Files:**
- Modify: `/Users/user/Developer/receipt-ai/model/receipt/schema-chat.ts`
- Modify: `/Users/user/Developer/receipt-ai/app/api/receipt/[id]/chat/route.ts`
- Modify: `/Users/user/Developer/receipt-ai/app/api/receipt/[id]/chat/validator.ts`
- Test: `/Users/user/Developer/receipt-ai/model/receipt/__tests__/receipt-chat-schemas.test.ts`
- Test: `/Users/user/Developer/receipt-ai/app/api/receipt/[id]/chat/__tests__/route.test.ts`

**Step 1: Write the failing schema/route tests**

Add expectations that:
- `claims_preview` returns a payload shaped like `{ positionClaims: Record<string, claim[]> }` or equivalent `[{ positionId, claims }]`, not a full receipt
- route context includes current user participant identity for the model prompt
- route still builds a client preview response for chat UI

**Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest model/receipt/__tests__/receipt-chat-schemas.test.ts 'app/api/receipt/[id]/chat/__tests__/route.test.ts' --run`

Expected: FAIL on the old `claims_preview` contract and missing current-user prompt expectations

**Step 3: Write minimal implementation**

Update schemas and route so that:
- `structural_preview` remains a full structural preview
- `claims_preview` model payload contains only claim data keyed by existing `positionId`
- route passes `currentUserParticipantId` and `currentUserDisplayName` to the LLM prompt
- route builds preview metadata needed by the UI from current receipt + claims payload

**Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest model/receipt/__tests__/receipt-chat-schemas.test.ts 'app/api/receipt/[id]/chat/__tests__/route.test.ts' --run`

Expected: PASS

**Step 5: Commit**

```bash
git add model/receipt/schema-chat.ts app/api/receipt/[id]/chat/route.ts app/api/receipt/[id]/chat/validator.ts model/receipt/__tests__/receipt-chat-schemas.test.ts app/api/receipt/[id]/chat/__tests__/route.test.ts
git commit -m "feat: reshape ai chat preview contracts"
```

### Task 2: Build structural diff preview and confirm UI

**Files:**
- Modify: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/AiChatStructuralPreview.tsx`
- Modify: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/AiChatDialog.tsx`
- Modify: `/Users/user/Developer/receipt-ai/app/i18n/translations.ts`
- Test: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx`
- Test: `/Users/user/Developer/receipt-ai/app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx`

**Step 1: Write the failing UI tests**

Add expectations that:
- structural preview renders row-level diff against the current receipt
- confirm step appears before apply
- warning block appears when structural apply would drop claims

**Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`

Expected: FAIL because current preview does not render diffs or confirm warnings

**Step 3: Write minimal implementation**

Implement:
- a structural diff builder comparing current form receipt vs AI structural preview
- visual treatments for added, removed, and changed lines
- confirm step with transparent warning list like `Ivan — Cheese 1 шт`
- apply button wiring hook point, but actual mutation can remain delegated to Task 3

**Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`

Expected: PASS

**Step 5: Commit**

```bash
git add app/receipt/components/AiChat/AiChatStructuralPreview.tsx app/receipt/components/AiChat/AiChatDialog.tsx app/i18n/translations.ts app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx
git commit -m "feat: add structural diff preview flow"
```

### Task 3: Apply structural previews into the form while preserving claims

**Files:**
- Modify: `/Users/user/Developer/receipt-ai/app/receipt/[id]/useReceiptFormState.ts`
- Modify: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/AiChatDialog.tsx`
- Create: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/structural-apply.ts`
- Test: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx`
- Test: `/Users/user/Developer/receipt-ai/app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx`

**Step 1: Write the failing apply test**

Add a test that:
- opens structural preview
- confirms apply
- verifies the RHF form receipt structure changes
- verifies existing claims remain on matched rows

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`

Expected: FAIL because apply does not currently mutate the form

**Step 3: Write minimal implementation**

Implement:
- helper that merges structural preview into current receipt
- claim preservation on matched items
- integration from AI dialog into form state
- reliance on existing autosave instead of separate apply API

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`

Expected: PASS

**Step 5: Commit**

```bash
git add app/receipt/[id]/useReceiptFormState.ts app/receipt/components/AiChat/AiChatDialog.tsx app/receipt/components/AiChat/structural-apply.ts app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx
git commit -m "feat: apply structural ai previews"
```

### Task 4: Build claims preview UI, confirm modes, and expiration handling

**Files:**
- Modify: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/AiChatDialog.tsx`
- Create: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/AiChatClaimsPreview.tsx`
- Create: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/claims-apply.ts`
- Modify: `/Users/user/Developer/receipt-ai/app/i18n/translations.ts`
- Test: `/Users/user/Developer/receipt-ai/app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx`
- Test: `/Users/user/Developer/receipt-ai/app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx`

**Step 1: Write the failing claims tests**

Add expectations that:
- claims preview omits total/unpaid header
- `Add` is always shown
- `Replace all` is shown only when current receipt already has claims for participants also present in AI preview
- replace confirm shows a warning list of lost allocations
- preview expires if referenced `positionId` no longer exists while confirm is open

**Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`

Expected: FAIL because claims preview currently uses the summary screen and has no apply modes

**Step 3: Write minimal implementation**

Implement:
- compact participant-only claims preview
- `Add` mode that appends claims without deleting existing ones
- conditional `Replace all` mode based on overlapping participant claims
- warning block listing distributions that would be lost
- expiration behavior when preview references missing positions

**Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`

Expected: PASS

**Step 5: Commit**

```bash
git add app/receipt/components/AiChat/AiChatDialog.tsx app/receipt/components/AiChat/AiChatClaimsPreview.tsx app/receipt/components/AiChat/claims-apply.ts app/i18n/translations.ts app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx
git commit -m "feat: add claims preview apply modes"
```

### Task 5: Visual verification and end-to-end browser coverage

**Files:**
- Modify: `/Users/user/Developer/receipt-ai/app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx`
- Update snapshots in: `/Users/user/Developer/receipt-ai/app/receipt/components/__tests__/__screenshots__/`

**Step 1: Write or update the failing browser scenarios**

Cover:
- structural diff preview
- structural warning before apply
- claims preview without summary header
- replace warning and expired claims preview state

**Step 2: Run browser tests to verify they fail**

Run: `pnpm exec vitest --config=vitest.browser.config.mts app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx --run`

Expected: FAIL on new screenshots/assertions before implementation is complete

**Step 3: Update implementation and snapshots minimally**

Only adjust visuals needed to satisfy the agreed UX.

**Step 4: Run browser tests to verify they pass**

Run: `pnpm exec vitest --config=vitest.browser.config.mts app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx --run`

Expected: PASS with updated screenshots

**Step 5: Commit**

```bash
git add app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx app/receipt/components/__tests__/__screenshots__
git commit -m "test: cover ai preview apply flows"
```
