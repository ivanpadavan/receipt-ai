"use client";

import { createUuid } from "@/app/receipt/utils/uuid";
import { t } from "@/app/i18n/translations";
import type { ParticipantDTO, Receipt, ReceiptModifier, ReceiptPosition } from "@/model/receipt/model";
import type { ReceiptChatResponse } from "@/model/receipt/schema-chat";

export type StructuralPreviewReceipt = Extract<
  ReceiptChatResponse,
  { type: "structural_preview" }
>["receipt"];

export type DiffStatus = "unchanged" | "added" | "removed" | "changed";

export type DiffEntry<TCurrent, TNext = TCurrent> = {
  index: number;
  status: DiffStatus;
  current?: TCurrent;
  next?: TNext;
};

export type StructuralLossWarning = {
  id: string;
  text: string;
};

type ModifierPreview = StructuralPreviewReceipt["fees"][number];

function findNextMatchIndex<TCurrent extends { id: string }, TNext extends { id?: string }>(
  currentId: string,
  nextItems: TNext[],
  startIndex: number,
) {
  return nextItems.findIndex(
    (item, index) => index >= startIndex && item.id === currentId,
  );
}

function buildIdFirstDiffs<TCurrent extends { id: string }, TNext extends { id?: string }>(
  currentItems: TCurrent[],
  nextItems: TNext[],
  areEqual: (currentItem: TCurrent, nextItem: TNext) => boolean,
) {
  const diffs: Array<DiffEntry<TCurrent, TNext>> = [];
  let nextIndex = 0;

  for (const current of currentItems) {
    const matchedNextIndex = findNextMatchIndex(current.id, nextItems, nextIndex);

    if (matchedNextIndex === -1) {
      diffs.push({ index: diffs.length, status: "removed", current });
      continue;
    }

    for (let i = nextIndex; i < matchedNextIndex; i += 1) {
      diffs.push({ index: diffs.length, status: "added", next: nextItems[i] });
    }

    const next = nextItems[matchedNextIndex];
    diffs.push(
      areEqual(current, next)
        ? { index: diffs.length, status: "unchanged", current, next }
        : { index: diffs.length, status: "changed", current, next },
    );
    nextIndex = matchedNextIndex + 1;
  }

  for (let i = nextIndex; i < nextItems.length; i += 1) {
    diffs.push({ index: diffs.length, status: "added", next: nextItems[i] });
  }

  return diffs;
}

function arePositionsEqual(left: ReceiptPosition, right: StructuralPreviewReceipt["positions"][number]) {
  return (
    left.name === right.name &&
    left.price === right.price &&
    left.quantity === right.quantity &&
    left.overall === right.overall
  );
}

function areModifiersEqual(left: ReceiptModifier, right: ModifierPreview) {
  return left.name === right.name && left.value === right.value;
}

function areTotalsEqual(left: Receipt["totals"], right: StructuralPreviewReceipt["totals"]) {
  return left.total === right.total && left.grandTotal === right.grandTotal;
}

function getParticipantNames(participantIds: string[], participants: ParticipantDTO[]) {
  return participantIds
    .map((participantId) => {
      const participant = participants.find((item) => item.id === participantId);
      return participant?.displayName ?? participantId;
    })
    .join(", ");
}

export function buildStructuralPositionDiffs(
  currentItems: ReceiptPosition[],
  nextItems: StructuralPreviewReceipt["positions"],
) {
  return buildIdFirstDiffs(currentItems, nextItems, arePositionsEqual);
}

export function buildStructuralModifierDiffs(
  currentItems: ReceiptModifier[],
  nextItems: StructuralPreviewReceipt["fees"] | StructuralPreviewReceipt["discounts"],
) {
  return buildIdFirstDiffs(currentItems, nextItems, areModifiersEqual);
}

export function buildStructuralTotalsDiffs(
  currentTotals: Receipt["totals"],
  nextTotals: StructuralPreviewReceipt["totals"],
) {
  return [
    areTotalsEqual(currentTotals, nextTotals)
      ? {
          index: 0,
          status: "unchanged" as const,
          current: currentTotals,
          next: nextTotals,
        }
      : {
          index: 0,
          status: "changed" as const,
          current: currentTotals,
          next: nextTotals,
        },
  ];
}

export function buildStructuralLossWarnings(
  currentReceipt: Receipt,
  previewReceipt: StructuralPreviewReceipt,
  participants: ParticipantDTO[],
  currencySymbol: string,
  formatMoney: (value: number, currencySymbolOverride?: string) => string,
) {
  return buildStructuralPositionDiffs(currentReceipt.positions, previewReceipt.positions)
    .filter(
      (entry) =>
        entry.status === "removed" &&
        entry.current !== undefined &&
        entry.current.claims.length > 0,
    )
    .flatMap((entry) =>
      entry.current.claims.map((claim, claimIndex) => {
        const participantLabel = getParticipantNames(claim.participantIds, participants);
        const claimLabel =
          claim.type === "quantity"
            ? `${claim.value} ${t("pcs")}`
            : formatMoney(claim.value, currencySymbol);

        return {
          id: `${entry.current.id}-${claim.id}-${claimIndex}`,
          text: `${participantLabel} — ${entry.current.name} ${claimLabel}`,
        };
      }),
    );
}

function applyPositionDiffs(
  currentPositions: ReceiptPosition[],
  previewPositions: StructuralPreviewReceipt["positions"],
) {
  return buildStructuralPositionDiffs(currentPositions, previewPositions)
    .flatMap((entry) => {
      if (entry.status === "removed" || !entry.next) {
        return [];
      }

      if (entry.current) {
        return [
          {
            ...entry.next,
            id: entry.current.id,
            claims: entry.current.claims,
          },
        ];
      }

      return [
        {
          ...entry.next,
          id: createUuid(),
          claims: [],
        },
      ];
    });
}

function applyModifierDiffs(
  currentModifiers: ReceiptModifier[],
  previewModifiers: StructuralPreviewReceipt["fees"] | StructuralPreviewReceipt["discounts"],
) {
  return buildStructuralModifierDiffs(currentModifiers, previewModifiers)
    .flatMap((entry) => {
      if (entry.status === "removed" || !entry.next) {
        return [];
      }

      if (entry.current) {
        return [
          {
            ...entry.next,
            id: entry.current.id,
          },
        ];
      }

      return [
        {
          ...entry.next,
          id: createUuid(),
        },
      ];
    });
}

export function applyStructuralPreview(
  currentReceipt: Receipt,
  previewReceipt: StructuralPreviewReceipt,
): Receipt {
  return {
    meta: {
      title: (previewReceipt.meta.title ?? currentReceipt.meta.title).trim(),
      currencySymbol:
        previewReceipt.meta.currencySymbol ?? currentReceipt.meta.currencySymbol,
    },
    positions: applyPositionDiffs(currentReceipt.positions, previewReceipt.positions),
    fees: applyModifierDiffs(currentReceipt.fees, previewReceipt.fees),
    discounts: applyModifierDiffs(currentReceipt.discounts, previewReceipt.discounts),
    totals: previewReceipt.totals,
  };
}
