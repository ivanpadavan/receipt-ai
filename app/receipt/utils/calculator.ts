import { Receipt, calculateTotal, calculateGrandTotal } from "@/model/receipt/model";

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

export const calculateBalances = (receipt: Receipt): ParticipantBalance[] => {
    const balances = new Map<string, ParticipantBalance>();

    // Initialize for all participants
    receipt.participants.forEach((p) => {
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
                claim.type === "quantity" ? claim.value * pos.price : claim.value;

            // If multiple participants share one claim, we split the value evenly among them?
            // Assuming "Split Evenly" logic applies to the claim itself if shared.
            // Usually a claim is created per user or group. If shared, we divide.
            const amountPerParticipant = claimValue / claim.participantIds.length;

            claim.participantIds.forEach((pid) => {
                const balance = balances.get(pid);
                if (balance) {
                    balance.baseAmount += amountPerParticipant;

                    let desc = "";
                    if (claim.type === "quantity") {
                        // If shared, show fraction?
                        const qty = claim.value / claim.participantIds.length;
                        desc = `${qty.toFixed(2)} × ${pos.price} ₽`; // e.g. "0.5 × 100"
                    } else {
                        desc = `${amountPerParticipant.toFixed(0)} ₽`;
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

    // Calculate totals to determine ratio
    const subtotal = calculateTotal(receipt.positions); // Sum of all positions prices*qty (theoretical max)
    // Wait, subtotal should be the sum of CLAIMED amounts? Or total receipt amount?
    // We want to distribute taxes based on total receipt ratio.
    // GrandTotal includes taxes on the WHOLE receipt.
    // So Ratio = GrandTotal / Subtotal(Positions).

    const totalPositionsValue = receipt.positions.reduce((acc, p) => acc + p.overall, 0);
    const grandTotal = calculateGrandTotal(receipt);

    const ratio = totalPositionsValue > 0 ? grandTotal / totalPositionsValue : 1;

    // Apply ratio
    return Array.from(balances.values()).map(b => ({
        ...b,
        finalAmount: b.baseAmount * ratio
    })).sort((a, b) => b.finalAmount - a.finalAmount);
};
