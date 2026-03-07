import { ReceiptPosition, ReceiptPositionClaim } from "@/model/receipt/model";
import { addMoney, multiplyMoney, roundMoney } from "@/app/receipt/utils/money";

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

export const comparePositionsByFillState = (
  left: ReceiptPosition,
  right: ReceiptPosition,
) =>
  Number(isPositionFilledAndValid(left)) -
  Number(isPositionFilledAndValid(right));

export const sortPositionsForDisplay = <T extends ReceiptPosition>(
  positions: T[],
) =>
  positions
    .map((position, originalIndex) => ({ position, originalIndex }))
    .sort((left, right) => {
      const byFill = comparePositionsByFillState(
        left.position,
        right.position,
      );
      return byFill !== 0 ? byFill : left.originalIndex - right.originalIndex;
    });
