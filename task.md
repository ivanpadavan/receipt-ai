# Task Checklist: Receipt Splitting & Editing

## Phase 1: Foundation & Database
- [ ] Update `prisma/schema.prisma` with `Participant` and `Claim` models
- [ ] Add `stableId` to the `Receipt` JSON schema (or ensure logic to generate/maintain them)
- [ ] Run database migration (`prisma migrate dev`)

## Phase 2: Backend Implementation
- [ ] Implement `PUT /api/receipt/[id]` to update receipt data (items, prices)
- [ ] Implement `POST /api/receipt/[id]/join` for guest registration
- [ ] Implement `POST /api/receipt/[id]/claim` for item claiming
- [ ] Implement `GET /api/receipt/[id]/status` (or SSE/Websocket) for real-time updates (optional but recommended for concurrent editing)

## Phase 3: Frontend - Receipt Editing (The "Host" Flow)
- [ ] Update `receipt-state.ts` to handle "Save" action
- [ ] Implement persistence logic in `ReceiptForm` (call the PUT endpoint)
- [ ] Add "Backtracking" logic: allow switching from "Splitting" back to "Editing"
- [ ] Ensure item IDs are preserved during edits to maintain claims where possible

## Phase 4: Frontend - Splitting UI (The "Guest" Flow)
- [ ] Create "Join Receipt" view (enter name)
- [ ] Implement "Select Mode" in `ReceiptForm` (toggle items as mine)
- [ ] Implement "Split Item" modal (1/2, 1/3, etc.)
- [ ] Display "My Total" with proportional tax/tip calculation
- [ ] Add "Claim All Remaining" button

## Phase 5: Refinement & Edge Cases
- [ ] Implement "Invalid Claim" detection (visual warning for deleted/modified items)
- [ ] Add "Clear Invalid Claims" action
- [ ] Handle concurrent editing conflicts (optimistic UI updates)
- [ ] Add "Pay Host" deep links (Venmo/Revolut)
- [ ] Final polish of the "Unified View" (ensure smooth transition between states)
