import {
  ParticipantDTO,
  Receipt,
  calculateGrandTotal,
} from "@/model/receipt/model";
import {
  addMoney,
  fromCents,
  multiplyMoney,
  roundMoney,
  toCents,
} from "@/app/receipt/utils/money";

export interface ParticipantBalance {
  participantId: string;
  baseAmount: number; // Sum of raw position claims
  finalAmount: number; // With fees/discounts distributed
  items: {
    positionName: string;
    description: string;
    rawAmount: number;
  }[];
}

export const calculateBalances = (
  receipt: Receipt,
  participants: ParticipantDTO[],
): ParticipantBalance[] => {
  const currencySymbol = receipt.meta.currencySymbol;
  const balances = new Map<string, ParticipantBalance>();

  // Initialize for all participants
  participants.forEach((p) => {
    balances.set(p.id, {
      participantId: p.id,
      baseAmount: 0,
      finalAmount: 0,
      items: [],
    });
  });

  // Iterate over positions
  receipt.positions.forEach((pos) => {
    pos.claims.forEach((claim) => {
      // Each claim can have multiple participants? No, model says claim has ONE value and MANY participants?
      // Type ReceiptPositionClaim = { value: number, type: "quantity" | "amount", participantIds: string[] }

      if (!claim.participantIds || claim.participantIds.length === 0) return;

      const claimValue =
        claim.type === "quantity"
          ? multiplyMoney(pos.price, claim.value)
          : roundMoney(claim.value);

      // If multiple participants share one claim, we split the value evenly among them?
      // Assuming "Split Evenly" logic applies to the claim itself if shared.
      // Usually a claim is created per user or group. If shared, we divide.
      const amountPerParticipant = fromCents(
        Math.round(toCents(claimValue) / claim.participantIds.length),
      );

      claim.participantIds.forEach((pid) => {
        const balance = balances.get(pid);
        if (balance) {
          balance.baseAmount = addMoney(balance.baseAmount, amountPerParticipant);

          let desc = "";
          if (pos.price > 0) {
            // Calculate quantity for both types (quantity or fixed amount)
            // amountPerParticipant is already calculated based on split
            const qty = amountPerParticipant / pos.price;

            // Format: 0.5 × 100
            // Use up to 3 decimal places for amount-derived quantity to be precise enough?
            // Or sticking to 2 is fine for UI.
            const qtyStr = Number.isInteger(qty)
              ? qty.toString()
              : qty.toFixed(2).replace(/\.?0+$/, "");
            desc = `${qtyStr} × ${pos.price} ${currencySymbol}`;
          }

          balance.items.push({
            positionName: pos.name,
            description: desc,
            rawAmount: amountPerParticipant,
          });
        }
      });
    });
  });

  const totalPositionsValue = receipt.positions.reduce(
    (acc, p) => addMoney(acc, p.overall),
    0,
  );
  const grandTotal = calculateGrandTotal(receipt);

  // Apply ratio
  return Array.from(balances.values())
    .map((b) => ({
      ...b,
      finalAmount:
        totalPositionsValue > 0
          ? fromCents(
              Math.round(
                (toCents(b.baseAmount) * toCents(grandTotal)) /
                  toCents(totalPositionsValue),
              ),
            )
          : b.baseAmount,
    }))
    .sort((a, b) => b.finalAmount - a.finalAmount);
};
