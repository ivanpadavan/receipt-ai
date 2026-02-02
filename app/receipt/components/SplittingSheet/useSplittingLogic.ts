import { useMemo, useState } from "react";
import {
  ReceiptParticipant,
  ReceiptPosition,
  ReceiptPositionClaim,
} from "@/model/receipt/model";
import { createDefaultClaim } from "@/app/receipt/[id]/useReceiptFormState";

export interface UseSplittingLogicProps {
  initialValue: ReceiptPosition;
  onSave: (data: ReceiptPosition) => void;
  currentUser: { id: string; email?: string } | null;
  participants: ReceiptParticipant[];
}

export const useSplittingLogic = ({
  initialValue,
  onSave,
  currentUser,
  participants,
}: UseSplittingLogicProps) => {
  const [localPosition, setLocalPosition] = useState<ReceiptPosition>(() =>
    structuredClone(initialValue),
  );

  const currentUserParticipantId = participants?.find(
    (p) =>
      p.name === currentUser?.email?.split("@")[0] || p.id === currentUser?.id,
  )?.id;

  // --- Draft Claims State (Map) ---
  const [draftClaims, setDraftClaims] = useState<
    Map<number | "new", ReceiptPositionClaim>
  >(
    new Map([
      [
        "new",
        {
          ...createDefaultClaim(),
          participantIds: currentUserParticipantId
            ? [currentUserParticipantId]
            : [],
        },
      ],
    ]),
  );

  // Helper to update draft state safely
  const updateDraft = (index: number | "new", claim: ReceiptPositionClaim) => {
    setDraftClaims((prev) => {
      const next = new Map(prev);
      next.set(index, claim);
      return next;
    });
  };

  const removeDraft = (index: number | "new") => {
    setDraftClaims((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  };

  // Create an effective position that includes ALL draft changes for live preview
  const effectivePosition = useMemo(() => {
    const pos = structuredClone(localPosition);

    draftClaims.forEach((claim, index) => {
      if (index === "new") {
        pos.claims.push(claim);
      } else {
        if (typeof index === "number" && pos.claims[index]) {
          pos.claims[index] = claim;
        }
      }
    });
    return pos;
  }, [localPosition, draftClaims]);

  const totalClaimed = effectivePosition.claims.reduce((acc, claim) => {
    if (!claim.participantIds || claim.participantIds.length === 0) return acc;
    if (claim.type === "quantity")
      return acc + claim.value * effectivePosition.price;
    return acc + claim.value;
  }, 0);

  const startAdding = () => {
    updateDraft("new", {
      ...createDefaultClaim(),
      participantIds: currentUserParticipantId
        ? [currentUserParticipantId]
        : [],
    });
  };

  const handleSaveDraft = (index: number | "new") => {
    const claim = draftClaims.get(index);
    if (!claim) return;

    if (index === "new") {
      if (claim.value <= 0) {
        return;
      }
      setLocalPosition((prev) => ({
        ...prev,
        claims: [...prev.claims, claim],
      }));
    } else {
      // Update existing
      setLocalPosition((prev) => ({
        ...prev,
        claims: prev.claims.map((c, i) => (i === index ? claim : c)),
      }));
    }
    removeDraft(index);
  };

  const handleDeleteClaim = (index: number) => {
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.filter((_, i) => i !== index),
    }));
    // Also remove from drafts if being edited
    if (draftClaims.has(index)) {
      removeDraft(index);
    }
  };

  const handleEditClick = (index: number, claim: ReceiptPositionClaim) => {
    updateDraft(index, claim);
  };

  const handleUpdateClaim = (
    index: number,
    updatedClaim: ReceiptPositionClaim,
  ) => {
    // Only used for update from view mode if allowed
    setLocalPosition((prev) => ({
      ...prev,
      claims: prev.claims.map((c, i) => (i === index ? updatedClaim : c)),
    }));
  };

  const handleDone = () => {
    const finalPosition = structuredClone(localPosition);

    // Auto-save NEW draft only if valid
    const newClaim = draftClaims.get("new");
    if (newClaim && newClaim.value > 0) {
      finalPosition.claims.push(newClaim);
    }

    onSave(finalPosition);
  };

  const newDraftClaim = draftClaims.get("new");

  return {
    localPosition,
    draftClaims,
    effectivePosition,
    totalClaimed,
    newDraftClaim,

    // Actions
    updateDraft,
    removeDraft,
    startAdding,
    handleSaveDraft,
    handleDeleteClaim,
    handleEditClick,
    handleUpdateClaim,
    handleDone,
  };
};
