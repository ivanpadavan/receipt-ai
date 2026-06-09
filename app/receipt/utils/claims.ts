import { ReceiptPosition, ReceiptPositionClaim } from "@/model/receipt/model";
import { addMoney, multiplyMoney, roundMoney } from "@/app/receipt/utils/money";
import { createUuid } from "@/app/receipt/utils/uuid";

export const getClaimAmount = (claim: ReceiptPositionClaim, price: number) => {
  if (!Number.isFinite(claim.value) || claim.value <= 0) return 0;
  if (claim.type === "quantity") return multiplyMoney(price, claim.value);
  return roundMoney(claim.value);
};

export const sumClaims = (
  claims: ReceiptPositionClaim[],
  price: number,
  excludeId?: string,
) => {
  return claims.reduce((acc, claim) => {
    if (excludeId && claim.id === excludeId) return acc;
    return addMoney(acc, getClaimAmount(claim, price));
  }, 0);
};

export const getClaimOverage = (
  claim: ReceiptPositionClaim,
  claims: ReceiptPositionClaim[],
  price: number,
  overall: number,
  excludeId?: string,
) => {
  const current = sumClaims(claims, price, excludeId);
  const next = addMoney(current, getClaimAmount(claim, price));
  const over = roundMoney(next - overall);
  return over > 0 ? over : 0;
};

export const canApplyClaim = (
  claim: ReceiptPositionClaim,
  claims: ReceiptPositionClaim[],
  price: number,
  overall: number,
  excludeId?: string,
) => getClaimOverage(claim, claims, price, overall, excludeId) === 0;

export const getDistributedPositionAmount = (
  claims: ReceiptPositionClaim[],
  price: number,
) =>
  claims.reduce((acc, claim) => {
    if (!claim.participantIds.length) return acc;
    return addMoney(acc, getClaimAmount(claim, price));
  }, 0);

export const isPositionFilled = (
  position: ReceiptPosition,
  tolerance = 0.01,
) => getDistributedPositionAmount(position.claims, position.price) >= position.overall - tolerance;

export const isPositionFilledAndValid = (
  position: ReceiptPosition,
  tolerance = 0.01,
) => {
  const totalClaims = getDistributedPositionAmount(position.claims, position.price);
  return totalClaims >= position.overall - tolerance && totalClaims <= position.overall + tolerance;
};

// ── Inline (current-user) share helpers ──────────────────────────────
//
// Inline editing in the positions list only touches the current user's own
// solo quantity claim. A "solo quantity claim" is a quantity-typed claim
// owned exclusively by the current user. Everything richer (other
// participants, amount-based or shared claims) stays in the splitting sheet.

export const findMyQuantityClaim = (
  claims: ReceiptPositionClaim[],
  userId: string | undefined,
) =>
  userId
    ? claims.find(
        (claim) =>
          claim.type === "quantity" &&
          claim.participantIds.length === 1 &&
          claim.participantIds[0] === userId,
      )
    : undefined;

// Maximum integer quantity the current user can take without overflowing the
// position. Reuses sumClaims so other participants' amount/shared claims are
// counted cent-safely. The 1e-9 nudge absorbs float dust before flooring.
export const getMyInlineMaxQuantity = (
  position: ReceiptPosition,
  userId: string | undefined,
) => {
  const { claims, price, overall } = position;
  if (price <= 0) return 0;

  const myClaim = findMyQuantityClaim(claims, userId);
  const claimedByOthers = sumClaims(claims, price, myClaim?.id);
  const remaining = Math.max(0, roundMoney(overall - claimedByOthers));

  return Math.floor(remaining / price + 1e-9);
};

// Returns a cloned position with the current user's solo quantity claim set to
// nextQty. nextQty <= 0 removes the claim; an existing claim is updated in
// place; otherwise a new claim is appended. All other claims are preserved.
export const setMyQuantity = (
  position: ReceiptPosition,
  userId: string | undefined,
  nextQty: number,
): ReceiptPosition => {
  if (!userId) return position;

  const value = Math.max(0, Math.round(nextQty));
  const existing = findMyQuantityClaim(position.claims, userId);

  if (value <= 0) {
    if (!existing) return position;
    return {
      ...position,
      claims: position.claims.filter((claim) => claim.id !== existing.id),
    };
  }

  if (existing) {
    return {
      ...position,
      claims: position.claims.map((claim) =>
        claim.id === existing.id ? { ...claim, value } : claim,
      ),
    };
  }

  return {
    ...position,
    claims: [
      ...position.claims,
      {
        id: createUuid(),
        value,
        type: "quantity",
        participantIds: [userId],
      },
    ],
  };
};
