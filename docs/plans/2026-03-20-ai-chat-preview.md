# AI Chat Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an AI chat on `receipt/[id]` that can return either a clarifying question, a structural receipt preview, or a claims summary preview, with no apply/revert in this iteration.

**Architecture:** Add a dedicated receipt chat endpoint plus typed preview schemas, keep all chat state local to a new dialog component, and reuse existing receipt UI where possible. Claims preview should reuse `SummaryScreen` from a server-normalized `Receipt` snapshot, while structural preview gets its own read-only receipt preview component.

**Tech Stack:** Next.js App Router, React 19, react-hook-form, Zod, LangChain OpenRouter, Vitest browser tests.

---

### Task 1: Define AI chat contracts and API plumbing

**Files:**
- Modify: `model/receipt/schema-structural.ts`
- Create: `model/receipt/schema-chat.ts`
- Modify: `model/receipt/schema.ts`
- Modify: `app/api-client/index.ts`
- Create: `app/api/receipt/[id]/chat/route.ts`
- Create: `app/api/receipt/[id]/chat/validator.ts`
- Test: `app/api/receipt/__tests__/output-parsing.test.ts` or new targeted chat schema test if needed

**Step 1: Write the failing schema/API test**

Add a targeted test that validates:
- `question` payload parses
- `structural_preview` payload parses
- `claims_preview` payload parses and rejects malformed data

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest model/receipt/__tests__/receipt-chat-schemas.test.ts --run`
Expected: FAIL because chat schema does not exist yet

**Step 3: Write minimal implementation**

Implement:
- chat response Zod union
- request validator for chat endpoint
- `apiClient.sendReceiptChatMessage(...)`
- API route skeleton returning validated union output

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest model/receipt/__tests__/receipt-chat-schemas.test.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add model/receipt/schema-structural.ts model/receipt/schema-chat.ts model/receipt/schema.ts app/api-client/index.ts app/api/receipt/[id]/chat/route.ts app/api/receipt/[id]/chat/validator.ts model/receipt/__tests__/receipt-chat-schemas.test.ts
git commit -m "feat: add receipt ai chat contracts"
```

### Task 2: Build AI chat dialog and preview components

**Files:**
- Create: `app/receipt/components/AiChat/AiChatDialog.tsx`
- Create: `app/receipt/components/AiChat/AiChatStructuralPreview.tsx`
- Create: `app/receipt/components/AiChat/index.ts`
- Modify: `app/receipt/components/ReceiptForm.tsx`
- Modify: `app/receipt/components/SummaryScreen/SummaryScreen.tsx` only if a minimal read-only embedding prop is required
- Test: `app/receipt/components/SummaryScreen/__tests__/SummaryScreen.test.tsx` only if API changes

**Step 1: Write the failing component test**

Add a component-level test that renders the AI dialog from mocked response data and verifies:
- question messages render
- structural preview renders receipt draft fields
- claims preview renders summary content

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`
Expected: FAIL because dialog and preview components do not exist yet

**Step 3: Write minimal implementation**

Implement:
- AI trigger button in the receipt title row with rainbow ring styling and chat label/icon
- local chat state and submit flow
- rendering branches by AI response `type`
- read-only structural preview component
- claims preview using `SummaryScreen`

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx --run`
Expected: PASS

**Step 5: Commit**

```bash
git add app/receipt/components/AiChat/AiChatDialog.tsx app/receipt/components/AiChat/AiChatStructuralPreview.tsx app/receipt/components/AiChat/index.ts app/receipt/components/ReceiptForm.tsx app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx
git commit -m "feat: add receipt ai chat preview ui"
```

### Task 3: Add browser coverage and screenshots

**Files:**
- Modify: `app/receipt/components/__tests__/ReceiptFormInner.browser.fixtures.ts`
- Modify: `app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx`
- Create/Update screenshots under: `app/receipt/components/__tests__/__screenshots__/ReceiptFormInner.browser.test.tsx/`

**Step 1: Write the failing browser test**

Add browser scenarios for:
- AI button visible in receipt header
- chat dialog open
- structural preview response shown
- claims preview response shown

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest --config=vitest.browser.config.mts app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx --run`
Expected: FAIL because AI chat UI and fixtures are not wired yet

**Step 3: Write minimal implementation**

Extend fixtures/mocks so browser tests can drive mocked AI responses and capture screenshots of the new chat states.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest --config=vitest.browser.config.mts app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx --run`
Expected: PASS with screenshot assertions updated

**Step 5: Commit**

```bash
git add app/receipt/components/__tests__/ReceiptFormInner.browser.fixtures.ts app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx app/receipt/components/__tests__/__screenshots__/ReceiptFormInner.browser.test.tsx
git commit -m "test: cover receipt ai chat preview"
```

### Task 4: Final verification

**Files:**
- Modify: only if verification reveals necessary minimal fixes

**Step 1: Run targeted unit tests**

Run: `pnpm exec vitest model/receipt/__tests__/receipt-chat-schemas.test.ts app/receipt/components/AiChat/__tests__/AiChatDialog.test.tsx app/receipt/components/SummaryScreen/__tests__/SummaryScreen.test.tsx --run`
Expected: PASS

**Step 2: Run browser test suite for receipt form**

Run: `pnpm exec vitest --config=vitest.browser.config.mts app/receipt/components/__tests__/ReceiptFormInner.browser.test.tsx --run`
Expected: PASS

**Step 3: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

**Step 4: Commit final fixes if needed**

```bash
git add <files>
git commit -m "fix: polish receipt ai chat preview"
```
