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

function buildAlignedDiffs<TCurrent, TNext = TCurrent>(
  currentItems: TCurrent[],
  nextItems: TNext[],
  areEqual: (currentItem: TCurrent, nextItem: TNext) => boolean,
  getFingerprint: (item: TCurrent | TNext) => string,
  isLikelyChange: (currentItem: TCurrent, nextItem: TNext) => boolean,
) {
  const diffs: Array<DiffEntry<TCurrent, TNext>> = [];
  let currentIndex = 0;
  let nextIndex = 0;

  while (currentIndex < currentItems.length || nextIndex < nextItems.length) {
    const current = currentItems[currentIndex];
    const next = nextItems[nextIndex];

    if (current && next) {
      if (areEqual(current, next)) {
        diffs.push({ index: diffs.length, status: "unchanged", current, next });
        currentIndex += 1;
        nextIndex += 1;
        continue;
      }

      const nextCurrent = currentItems[currentIndex + 1];
      if (nextCurrent && getFingerprint(nextCurrent) === getFingerprint(next)) {
        diffs.push({ index: diffs.length, status: "removed", current });
        currentIndex += 1;
        continue;
      }

      const nextPreview = nextItems[nextIndex + 1];
      if (nextPreview && getFingerprint(current) === getFingerprint(nextPreview)) {
        diffs.push({ index: diffs.length, status: "added", next });
        nextIndex += 1;
        continue;
      }

      if (isLikelyChange(current, next)) {
        diffs.push({ index: diffs.length, status: "changed", current, next });
      } else {
        diffs.push({ index: diffs.length, status: "removed", current });
        diffs.push({ index: diffs.length, status: "added", next });
      }
      currentIndex += 1;
      nextIndex += 1;
      continue;
    }

    if (current) {
      diffs.push({ index: diffs.length, status: "removed", current });
      currentIndex += 1;
      continue;
    }

    if (next) {
      diffs.push({ index: diffs.length, status: "added", next });
      nextIndex += 1;
      continue;
    }
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

function arePositionsLikelyChanged(
  left: ReceiptPosition,
  right: StructuralPreviewReceipt["positions"][number],
) {
  return (
    left.name === right.name ||
    (left.quantity === right.quantity && left.price === right.price) ||
    left.overall === right.overall
  );
}

function areModifiersEqual(left: ReceiptModifier, right: ModifierPreview) {
  return left.name === right.name && left.value === right.value;
}

function areModifiersLikelyChanged(left: ReceiptModifier, right: ModifierPreview) {
  return left.name === right.name;
}

function areTotalsEqual(left: Receipt["totals"], right: StructuralPreviewReceipt["totals"]) {
  return left.total === right.total && left.grandTotal === right.grandTotal;
}

function getPositionFingerprint(
  item: ReceiptPosition | StructuralPreviewReceipt["positions"][number],
) {
  return `${item.name}\u0000${item.price}\u0000${item.quantity}\u0000${item.overall}`;
}

function getModifierFingerprint(item: ReceiptModifier | ModifierPreview) {
  return `${item.name}\u0000${item.value}`;
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
  return buildAlignedDiffs(
    currentItems,
    nextItems,
    arePositionsEqual,
    getPositionFingerprint,
    arePositionsLikelyChanged,
  );
}

export function buildStructuralModifierDiffs(
  currentItems: ReceiptModifier[],
  nextItems: StructuralPreviewReceipt["fees"] | StructuralPreviewReceipt["discounts"],
) {
  return buildAlignedDiffs(
    currentItems,
    nextItems,
    areModifiersEqual,
    getModifierFingerprint,
    areModifiersLikelyChanged,
  );
}

export function buildStructuralTotalsDiffs(
  currentTotals: Receipt["totals"],
  nextTotals: StructuralPreviewReceipt["totals"],
) {
  return buildAlignedDiffs(
    [currentTotals],
    [nextTotals],
    areTotalsEqual,
    () => "totals",
    () => true,
  );
}

export function buildStructuralLossWarnings(
  currentReceipt: Receipt,
  previewReceipt: StructuralPreviewReceipt,
  participants: ParticipantDTO[],
  currencySymbol: string,
  formatMoney: (value: number, currencySymbolOverride?: string) => string,
) {
  return buildStructuralPositionDiffs(currentReceipt.positions, previewReceipt.positions)
    .filter((entry) => entry.status === "removed" && entry.current && entry.current.claims.length > 0)
    .flatMap((entry) =>
      entry.current!.claims.map((claim, claimIndex) => {
        const participantLabel = getParticipantNames(claim.participantIds, participants);
        const claimLabel =
          claim.type === "quantity"
            ? `${claim.value} ${t("pcs")}`
            : formatMoney(claim.value, currencySymbol);

        return {
          id: `${entry.current!.id}-${claim.id}-${claimIndex}`,
          text: `${participantLabel} — ${entry.current!.name} ${claimLabel}`,
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
