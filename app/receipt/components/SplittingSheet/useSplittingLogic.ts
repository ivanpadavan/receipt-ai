import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ParticipantDTO,
  ReceiptPosition,
  ReceiptPositionClaim,
} from "@/model/receipt/model";
import { createDefaultClaim } from "@/app/receipt/[id]/useReceiptFormState";
import { canApplyClaim, getClaimAmount } from "@/app/receipt/utils/claims";

export interface UseSplittingLogicProps {
  initialValue: ReceiptPosition;
  onSave: (data: ReceiptPosition) => void;
  currentUser: { id: string; email?: string } | null;
  participants: ParticipantDTO[];
}

export type ActiveDraftId = string | "new" | null;

export const useSplittingLogic = ({
  initialValue,
  onSave,
  currentUser,
  participants,
}: UseSplittingLogicProps) => {
  const [localPosition, setLocalPosition] = useState<ReceiptPosition>(() =>
    structuredClone(initialValue),
  );

  const currentUserParticipantId = participants.find(
    (participant) => participant.id === currentUser?.id,
  )?.id;

  const createDraft = useCallback(
    () => ({
      ...createDefaultClaim(),
      participantIds: currentUserParticipantId
        ? [currentUserParticipantId]
        : [],
    }),
    [currentUserParticipantId],
  );

  const [activeDraftId, setActiveDraftId] = useState<ActiveDraftId>("new");
  const [draftClaim, setDraftClaim] = useState<ReceiptPositionClaim | null>(
    createDraft(),
  );

  const cancelDraft = useCallback(() => {
    setActiveDraftId(null);
    setDraftClaim(null);
  }, []);

  const startAdding = useCallback(() => {
    setActiveDraftId("new");
    setDraftClaim(createDraft());
  }, [createDraft]);

  const startEditing = useCallback((claim: ReceiptPositionClaim) => {
    setActiveDraftId(claim.id);
    setDraftClaim(structuredClone(claim));
  }, []);

  const updateDraft = useCallback((claim: ReceiptPositionClaim) => {
    setDraftClaim(claim);
  }, []);

  const saveDraft = useCallback(() => {
    if (!activeDraftId || !draftClaim || draftClaim.value <= 0) {
      return false;
    }

    const excludeId = activeDraftId === "new" ? undefined : activeDraftId;
    const canSave = canApplyClaim(
      draftClaim,
      localPosition.claims,
      localPosition.price,
      localPosition.overall,
      excludeId,
    );

    if (!canSave) {
      return false;
    }

    const nextPosition = structuredClone(localPosition);

    if (activeDraftId === "new") {
      nextPosition.claims.push(draftClaim);
    } else {
      nextPosition.claims = nextPosition.claims.map((claim) =>
        claim.id === activeDraftId ? draftClaim : claim,
      );
    }

    setLocalPosition(nextPosition);
    onSave(nextPosition);
    cancelDraft();

    return true;
  }, [activeDraftId, cancelDraft, draftClaim, localPosition, onSave]);

  const deleteClaim = useCallback(
    (claim: ReceiptPositionClaim) => {
      const nextPosition = {
        ...localPosition,
        claims: localPosition.claims.filter((currentClaim) => currentClaim.id !== claim.id),
      };

      setLocalPosition(nextPosition);
      onSave(nextPosition);

      if (activeDraftId === claim.id) {
        cancelDraft();
      }
    },
    [activeDraftId, cancelDraft, localPosition, onSave],
  );

  const effectivePosition = useMemo(() => {
    if (!activeDraftId || !draftClaim) {
      return localPosition;
    }

    const nextPosition = structuredClone(localPosition);

    if (activeDraftId === "new") {
      nextPosition.claims.push(draftClaim);
      return nextPosition;
    }

    nextPosition.claims = nextPosition.claims.map((claim) =>
      claim.id === activeDraftId ? draftClaim : claim,
    );

    return nextPosition;
  }, [activeDraftId, draftClaim, localPosition]);

  const totalClaimed = useMemo(
    () =>
      effectivePosition.claims.reduce((acc, claim) => {
        if (!claim.participantIds.length) {
          return acc;
        }

        return acc + getClaimAmount(claim, effectivePosition.price);
      }, 0),
    [effectivePosition],
  );

  const handleDone = useCallback(() => {
    onSave(localPosition);
  }, [localPosition, onSave]);

  return {
    localPosition,
    effectivePosition,
    totalClaimed,
    activeDraftId,
    draftClaim,
    startAdding,
    startEditing,
    updateDraft,
    cancelDraft,
    saveDraft,
    deleteClaim,
    handleDone,
  };
};
