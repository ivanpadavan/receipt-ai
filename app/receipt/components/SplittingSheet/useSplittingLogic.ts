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
    Map<string | "new", ReceiptPositionClaim>
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
  const updateDraft = (id: string | "new", claim: ReceiptPositionClaim) => {
    setDraftClaims((prev) => {
      const next = new Map(prev);
      next.set(id, claim);
      return next;
    });
  };

  const removeDraft = (id: string | "new") => {
    setDraftClaims((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  // Create an effective position that includes ALL draft changes for live preview
  const effectivePosition = useMemo(() => {
    const pos = structuredClone(localPosition);

    draftClaims.forEach((claim, id) => {
      if (id === "new") {
        pos.claims.push(claim);
      } else {
        const existingIndex = pos.claims.findIndex((c) => c.id === id);
        if (existingIndex >= 0) {
          pos.claims[existingIndex] = claim;
        } else {
          pos.claims.push(claim);
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

  const handleSaveDraft = (id: string | "new") => {
    const claim = draftClaims.get(id);
    if (!claim) return;

    const nextPosition = structuredClone(localPosition);

    if (id === "new") {
      if (claim.value <= 0) {
        return;
      }
      nextPosition.claims.push(claim);
    } else {
      // Update existing
      nextPosition.claims = nextPosition.claims.map((c) =>
        c.id === id ? claim : c,
      );
    }

    setLocalPosition(nextPosition);
    onSave(nextPosition);
    removeDraft(id);
  };

  const handleDeleteClaim = (id: string) => {
    const nextPosition = {
      ...localPosition,
      claims: localPosition.claims.filter((c) => c.id !== id),
    };

    setLocalPosition(nextPosition);
    onSave(nextPosition);

    // Also remove from drafts if being edited
    if (draftClaims.has(id)) {
      removeDraft(id);
    }
  };

  const handleEditClick = (id: string, claim: ReceiptPositionClaim) => {
    updateDraft(id, claim);
  };

  const handleUpdateClaim = (
    id: string,
    updatedClaim: ReceiptPositionClaim,
  ) => {
    // Only used for update from view mode if allowed
    const nextPosition = {
      ...localPosition,
      claims: localPosition.claims.map((c) =>
        c.id === id ? updatedClaim : c,
      ),
    };
    setLocalPosition(nextPosition);
    onSave(nextPosition);
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
