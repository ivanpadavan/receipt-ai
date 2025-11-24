# Receipt Splitting: Gap Analysis & Roadmap

## 1. Current State vs. Desired State

| Feature | Current State | Desired State |
| :--- | :--- | :--- |
| **Step 1: Validation** | **Partially Implemented.** <br> - Frontend has "Validation Mode" to fix AI math errors.<br> - Backend can *create* receipts but cannot *update* them after validation.<br> - No "Save" button logic implemented. | **Fully Implemented.**<br> - Host verifies AI data.<br> - Host saves the "Master Receipt".<br> - Receipt is accessible via link immediately. |
| **Step 2: Access** | **Restricted.**<br> - Only the creator (Host) can view the receipt.<br> - Requires login (`app/history/page.tsx` checks session). | **Public/Shared Access.**<br> - Unique, obscure link (e.g., `/receipt/[id]`).<br> - **No Distinct Host View**: Anyone with the link can view and interact.<br> - Accessible to guests (no login required) via the link. |
| **Step 3: Workflow** | **Linear/Rigid.**<br> - Edit -> Save -> Done (implied). | **Flexible/Iterative.**<br> - **Backtracking**: Any user can switch back to "Edit Mode" to fix the receipt items even after claiming has started.<br> - **Invalidation**: If an item is deleted/edited, any claims on it become "Invalid". Users see a warning and can clear invalid claims with one click. |
| **Step 4: Claiming** | **Non-Existent.**<br> - No database models for participants or claims.<br> - No UI for selecting items. | **Interactive Splitting UI.**<br> - Guest enters name (e.g., "Alice").<br> - Guest taps items to claim them.<br> - Support for splitting single items (e.g., "1/2 of Pizza").<br> - Real-time calculation of "My Total". |
| **Step 5: Math** | **Basic.**<br> - Simple sum of rows.<br> - Manual modifiers (tax/tip). | **Proportional Calculation.**<br> - `MyTotal = MyItems + (MyItems / Subtotal) * (Tax + Tip)`<br> - **No Exceptions**: All fees/taxes are split proportionally by value. |

## 2. Technical Gaps (The "To-Do" List)

### Database (`prisma/schema.prisma`)
*   **Missing Models**: Need to add `Participant` and `ItemClaim` models.
    ```prisma
    model Participant {
      id        String   @id @default(cuid())
      name      String
      receiptId String
      receipt   Receipt  @relation(fields: [receiptId], references: [id])
      claims    Claim[]
    }
    
    model Claim {
      id            String      @id @default(cuid())
      participantId String
      participant   Participant @relation(fields: [participantId], references: [id])
      itemId        String      // ID of the item in the JSON blob (needs stable IDs)
      fraction      Float       // e.g., 1.0 for full item, 0.5 for half
    }
    ```
*   **Stable IDs**: The `Receipt` JSON blob needs stable IDs for every item so claims can persist across edits (where possible).

### Backend
*   **Update Endpoint**: `PUT /api/receipt/[id]` to save the validated "Master Receipt".
*   **Join Endpoint**: `POST /api/receipt/[id]/join` to register a guest.
*   **Claim Endpoint**: `POST /api/receipt/[id]/claim` to update what a user is paying for.

### Frontend
*   **Unified View**: A single page `/receipt/[id]` that adapts based on state (Editing vs. Splitting).
*   **Selection UI**: A "Select Mode" where tapping a row toggles it as "Mine".
*   **Conflict Resolution**: UI to show "Item X was deleted" if a claimed item disappears.

## 3. Thoughts on Convenience & Edge Cases

### The "Convenience" Factors
1.  **No-Login Required**: This is crucial. If I'm at dinner, I'm not creating an account just to pay $20. Use a generated "Guest Token" stored in LocalStorage.
2.  **"Everything Else" Button**: The Host often pays for shared appetizers or "whatever is left". A button to "Claim all remaining items" is a huge time-saver.
3.  **Venmo/Payment Link**: After calculating $25.50, show a "Pay Host" button that deep-links to Venmo/Revolut with the amount pre-filled.

### Edge Cases & Caveats

#### A. The "Shared Appetizer" Problem
*   **Scenario**: 3 people share "Nachos ($12)".
*   **Solution**:
    *   *Simple*: One person claims it.
    *   *Better*: Allow "Split Item". User taps item -> selects "1/3".
    *   *Complex*: "I only had one chip". (Avoid this; it complicates the UI too much. Stick to equal splits).

#### B. The "Quantity" Problem
*   **Scenario**: Receipt says "2x Beer ... $16".
*   **Solution**: The system must recognize `quantity > 1`. When tapped, ask: "Claim 1 or 2?".
*   **Technical**: The AI parsing must accurately separate `quantity` and `unitPrice`.

#### C. Concurrent Editing (The "Race Condition")
*   **Scenario**: Alice and Bob both claim the "Steak" at the same time.
*   **Solution**: **Optimistic**. Let them both claim it. Show "Conflict: Steak claimed by Alice and Bob".

#### D. The "Invalid Claim" Problem (Backtracking)
*   **Scenario**: Alice claims "Burger ($15)". Bob goes back to Edit Mode and changes "Burger" to "Cheeseburger ($16)" or deletes it.
*   **Solution**:
    *   If ID persists: Alice's claim updates to "Cheeseburger ($16)".
    *   If ID deleted: Alice sees "Invalid Claim" warning.
    *   **Action**: "Clear Invalid Claims" button to remove them instantly.

#### E. The "Unclaimed" Gap
*   **Scenario**: Everyone finishes selecting, but $5 is missing from the total.
*   **Solution**: The view must clearly highlight **Unclaimed Items** so they aren't forgotten.
