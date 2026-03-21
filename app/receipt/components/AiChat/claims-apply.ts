"use client";

import { createUuid } from "@/app/receipt/utils/uuid";
import { t } from "@/app/i18n/translations";
import type { ParticipantDTO, Receipt, ReceiptPositionClaim } from "@/model/receipt/model";
import type { ReceiptChatResponse } from "@/model/receipt/schema-chat";
import type { StructuralLossWarning } from "@/app/receipt/components/AiChat/structural-apply";

type ClaimsPreviewResponse = Extract<ReceiptChatResponse, { type: "claims_preview" }>;

type PositionClaimsMap = ClaimsPreviewResponse["positionClaims"];
type IncomingClaim = PositionClaimsMap[string][number];
export type ClaimsPreviewStatus = "pending" | "applied" | "expired";

function getParticipantNames(participantIds: string[], participants: ParticipantDTO[]) {
  return participantIds
    .map((participantId) => {
      const participant = participants.find((item) => item.id === participantId);
      return participant?.displayName ?? participantId;
    })
    .join(", ");
}

function claimIdentityKey(claim: Pick<ReceiptPositionClaim, "participantIds" | "type" | "value">, positionId?: string) {
  const participantIds = [...claim.participantIds].sort().join(",");
  return `${positionId}\u0000${participantIds}\u0000${claim.type}\u0000${claim.value}`;
}

function normalizeIncomingClaim(claim: IncomingClaim): ReceiptPositionClaim {
  return {
    ...claim,
    id: createUuid(),
    participantIds: [...claim.participantIds],
  };
}

function getAiParticipantIds(positionClaims: PositionClaimsMap) {
  return new Set(
    Object.values(positionClaims)
      .flat()
      .flatMap((claim) => claim.participantIds),
  );
}

function claimTouchesParticipants(claim: ReceiptPositionClaim, participantIds: Set<string>) {
  return claim.participantIds.some((participantId) => participantIds.has(participantId));
}

export function hasClaimsPreviewData(positionClaims: PositionClaimsMap) {
  return Object.values(positionClaims).some((claims) => claims.length > 0);
}

export function isClaimsPreviewExpired(
  currentReceipt: Receipt,
  positionClaims: PositionClaimsMap,
) {
  const positionIds = new Set(currentReceipt.positions.map((p) => p.id));
  return Object.keys(positionClaims).some((id) => !positionIds.has(id));
}

export function buildClaimsPreviewRemovedPositions(
  currentReceipt: Receipt,
  receiptSnapshot: Receipt,
) {
  const currentPositionsById = new Map(
    currentReceipt.positions.map((position) => [position.id, position]),
  );

  return receiptSnapshot.positions.filter((snapshotPosition) => {
    return !currentPositionsById.has(snapshotPosition.id);
  });
}

export function isClaimsPreviewApplied(
  currentReceipt: Receipt,
  positionClaims: PositionClaimsMap,
) {
  const serializedPreviewClaims = Object.entries(positionClaims).flatMap(([k, v]) =>
    v.map((c) => claimIdentityKey(c, k)),
  );
  const serializedReceiptClaims = new Set(currentReceipt.positions.flatMap((p) =>
    p.claims.map((c) => claimIdentityKey(c, p.id)))
  );
  return serializedPreviewClaims.every((s) => serializedReceiptClaims.has(s));
}

export function getClaimsPreviewStatus(
  currentReceipt: Receipt,
  positionClaims: PositionClaimsMap,
): ClaimsPreviewStatus {
  if (isClaimsPreviewExpired(currentReceipt, positionClaims)) {
    return "expired";
  }

  if (isClaimsPreviewApplied(currentReceipt, positionClaims)) {
    return "applied";
  }

  return "pending";
}

export function canReplaceClaimsPreview(
  currentReceipt: Receipt,
  positionClaims: PositionClaimsMap,
) {
  const aiParticipantIds = getAiParticipantIds(positionClaims);
  if (aiParticipantIds.size === 0) {
    return false;
  }

  return currentReceipt.positions.some((position) =>
    position.claims.some((claim) => claimTouchesParticipants(claim, aiParticipantIds)),
  );
}

export function buildClaimsReplaceWarnings(
  currentReceipt: Receipt,
  positionClaims: PositionClaimsMap,
  participants: ParticipantDTO[],
  formatMoney: (value: number, currencySymbolOverride?: string) => string,
) {
  const aiParticipantIds = getAiParticipantIds(positionClaims);
  if (aiParticipantIds.size === 0) {
    return [];
  }

  return currentReceipt.positions.flatMap((position) => {
    const nextClaims = positionClaims[position.id] ?? [];
    const nextClaimKeys = new Set(nextClaims.map((value) => claimIdentityKey(value)));

    return position.claims.flatMap((claim, claimIndex) => {
      if (!claimTouchesParticipants(claim, aiParticipantIds)) {
        return [];
      }

      if (nextClaimKeys.has(claimIdentityKey(claim))) {
        return [];
      }

      const participantLabel = getParticipantNames(claim.participantIds, participants);
      const claimLabel =
        claim.type === "quantity"
          ? `${claim.value} ${t("pcs")}`
          : formatMoney(claim.value);

      return [
        {
          id: `${position.id}-${claim.id}-${claimIndex}`,
          text: `${participantLabel} — ${position.name} ${claimLabel}`,
        } satisfies StructuralLossWarning,
      ];
    });
  });
}

export function applyClaimsPreviewAdd(
  currentReceipt: Receipt,
  positionClaims: PositionClaimsMap,
): Receipt {
  return {
    ...currentReceipt,
    positions: currentReceipt.positions.map((position) => {
      const incomingClaims = positionClaims[position.id] ?? [];
      if (incomingClaims.length === 0) {
        return position;
      }

      const existingClaimKeys = new Set(
        position.claims.map((value) => claimIdentityKey(value)),
      );
      const nextClaims = incomingClaims
        .filter((claim) => !existingClaimKeys.has(claimIdentityKey(claim)))
        .map(normalizeIncomingClaim);

      if (nextClaims.length === 0) {
        return position;
      }

      return {
        ...position,
        claims: [...position.claims, ...nextClaims],
      };
    }),
  };
}

export function applyClaimsPreviewReplace(
  currentReceipt: Receipt,
  positionClaims: PositionClaimsMap,
): Receipt {
  const aiParticipantIds = getAiParticipantIds(positionClaims);

  return {
    ...currentReceipt,
    positions: currentReceipt.positions.map((position) => {
      const replacementClaims = (positionClaims[position.id] ?? []).map(normalizeIncomingClaim);
      const preservedClaims = position.claims.filter(
        (claim) => !claimTouchesParticipants(claim, aiParticipantIds),
      );

      return {
        ...position,
        claims: [...preservedClaims, ...replacementClaims],
      };
    }),
  };
}
