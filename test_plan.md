# Test Plan: Receipt Splitting & Editing

## 1. Validation & Editing (The "Host" Flow)

### TC-1.1: Validation of Invalid Receipt
*   **Precondition**: Upload a receipt where `Sum(Items) != Total`.
*   **Action**: System detects error and enters "Validation Mode".
*   **Step**: User corrects the price of an item.
*   **Expected**: Validation errors disappear, "Proceed" button becomes enabled.

### TC-1.2: Saving Validated Receipt
*   **Precondition**: Receipt is valid.
*   **Action**: User clicks "Proceed".
*   **Expected**:
    *   Data is saved to the database.
    *   UI transitions to "Splitting Mode" (or "Unified View").
    *   URL remains shareable.

### TC-1.3: Backtracking to Edit
*   **Precondition**: User is in "Splitting Mode".
*   **Action**: User clicks "Edit Receipt".
*   **Expected**:
    *   UI reverts to "Editing Mode".
    *   User can add/remove items or change prices.
    *   User clicks "Save".
    *   UI returns to "Splitting Mode".

## 2. Guest Access & Joining

### TC-2.1: Guest Access via Link
*   **Precondition**: Host shares link `/receipt/[id]`.
*   **Action**: Guest opens link in incognito window (no login).
*   **Expected**:
    *   Page loads.
    *   User is prompted to enter a Name.
    *   Receipt items are visible (Read-only until joined).

### TC-2.2: Joining Session
*   **Action**: Guest enters name "Alice" and clicks "Join".
*   **Expected**:
    *   "Alice" is added to the participant list.
    *   UI enables "Select Mode" for items.

## 3. Claiming & Splitting

### TC-3.1: Claiming a Full Item
*   **Action**: Alice taps "Burger ($15)".
*   **Expected**:
    *   Item is highlighted as "Alice's".
    *   Alice's Total updates: `$15 + Tax + Tip`.

### TC-3.2: Splitting an Item
*   **Action**: Bob taps "Pizza ($20)" -> Selects "Split" -> "1/2".
*   **Expected**:
    *   Item shows "1/2 Alice, 1/2 Bob" (if Alice also claimed).
    *   Bob's Total increases by `$10 + Tax + Tip`.

### TC-3.3: Unclaiming
*   **Action**: Alice taps "Burger" again.
*   **Expected**:
    *   Item highlight is removed.
    *   Alice's Total decreases.

### TC-3.4: Claim All Remaining
*   **Precondition**: 3 items unclaimed.
*   **Action**: User clicks "Claim Remaining".
*   **Expected**: All 3 items are assigned to the user.

## 4. Math & Proportions

### TC-4.1: Proportional Tax/Tip
*   **Scenario**: Subtotal $100, Tax $10 (10%), Tip $20 (20%).
*   **Action**: User claims items worth $50.
*   **Expected**:
    *   User's Share of Items: $50.
    *   User's Share of Tax: $5 (10% of $50).
    *   User's Share of Tip: $10 (20% of $50).
    *   **Total Displayed**: $65.

## 5. Edge Cases & Invalidation

### TC-5.1: Concurrent Claiming
*   **Action**: Alice and Bob claim "Fries" simultaneously.
*   **Expected**: Item shows as claimed by both (Optimistic UI). No errors.

### TC-5.2: Invalid Claim (Item Deleted)
*   **Precondition**: Alice claims "Salad".
*   **Action**: Host backtracks to Edit Mode and deletes "Salad". Saves.
*   **Expected**:
    *   Alice sees a warning: "Some items were removed".
    *   Alice's Total is recalculated (excluding Salad).
    *   "Salad" is removed from the list.

### TC-5.3: Invalid Claim (Item Price Changed)
*   **Precondition**: Alice claims "Steak ($20)".
*   **Action**: Host changes "Steak" price to $25. Saves.
*   **Expected**:
    *   Alice's claim persists.
    *   Alice's Total updates to reflect the new price ($25 + tax/tip).
