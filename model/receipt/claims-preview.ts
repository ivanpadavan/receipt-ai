import type { Receipt, ReceiptPositionClaim } from "@/model/receipt/model";

export type ReceiptClaimsPreviewMap = Record<
  string,
  Array<Omit<ReceiptPositionClaim, "id">>
>;

export type ReceiptClaimsPreviewSourcePosition = Omit<
  Receipt["positions"][number],
  "claims"
> & {
  claims: Array<Omit<ReceiptPositionClaim, "id">>;
};

export type ReceiptClaimsPreviewSourceReceipt = Omit<Receipt, "positions"> & {
  positions: ReceiptClaimsPreviewSourcePosition[];
};

function claimSemanticKey(
  claim: Omit<ReceiptPositionClaim, "id"> | ReceiptPositionClaim,
) {
  const participantIds = [...claim.participantIds].sort().join(",");
  return `${participantIds}\u0000${claim.type}\u0000${claim.value}`;
}

function stripClaimId(
  claim: ReceiptPositionClaim | Omit<ReceiptPositionClaim, "id">,
): Omit<ReceiptPositionClaim, "id"> {
  const { id: _id, ...rest } = claim;
  return rest;
}

function materializeClaim(
  positionId: string,
  claim: Omit<ReceiptPositionClaim, "id">,
  index: number,
): ReceiptPositionClaim {
  return {
    ...claim,
    id: `${positionId}-preview-claim-${index}`,
  };
}

export function buildClaimsPreviewReceipt(
  receipt: Receipt,
  positionClaims: ReceiptClaimsPreviewMap,
): Receipt {
  return {
    ...receipt,
    positions: receipt.positions.map((position) => {
      const nextClaims = positionClaims[position.id];
      if (nextClaims === undefined) {
        return position;
      }

      return {
        ...position,
        claims: nextClaims.map((claim, index) =>
          materializeClaim(position.id, claim, index),
        ),
      };
    }),
  };
}

function comparePositionClaims(
  currentClaims: ReceiptPositionClaim[],
  nextClaims: ReceiptPositionClaim[],
) {
  if (currentClaims.length !== nextClaims.length) {
    return false;
  }

  const currentKeys = currentClaims.map(claimSemanticKey).sort();
  const nextKeys = nextClaims.map(claimSemanticKey).sort();

  return currentKeys.every((key, index) => key === nextKeys[index]);
}

export function reduceClaimsPreviewReceipt(
  currentReceipt: Receipt,
  nextReceipt: ReceiptClaimsPreviewSourceReceipt,
): ReceiptClaimsPreviewMap {
  const currentPositionsById = new Map(
    currentReceipt.positions.map((position) => [position.id, position] as const),
  );
  const nextPositionsById = new Map(
    nextReceipt.positions.map((position) => [position.id, position] as const),
  );

  if (currentPositionsById.size !== nextPositionsById.size) {
    throw new Error("AI produced malformed request");
  }

  for (const position of currentReceipt.positions) {
    const nextPosition = nextPositionsById.get(position.id);
    if (!nextPosition) {
      throw new Error("AI produced malformed request");
    }

    if (
      nextPosition.name !== position.name ||
      nextPosition.price !== position.price ||
      nextPosition.quantity !== position.quantity ||
      nextPosition.overall !== position.overall
    ) {
      throw new Error("AI produced malformed request");
    }
  }

  for (const position of nextReceipt.positions) {
    if (!currentPositionsById.has(position.id)) {
      throw new Error("AI produced malformed request");
    }
  }

  const positionClaims: ReceiptClaimsPreviewMap = {};

  for (const position of currentReceipt.positions) {
    const nextPosition = nextPositionsById.get(position.id);
    if (!nextPosition) {
      throw new Error("AI produced malformed request");
    }

    if (!comparePositionClaims(position.claims, nextPosition.claims)) {
      positionClaims[position.id] = nextPosition.claims.map(stripClaimId);
    }
  }

  return positionClaims;
}
