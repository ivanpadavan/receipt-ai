import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import { ReceiptPosition } from "@/model/receipt/model";
import { comparePositionsByFillState } from "@/app/receipt/utils/claims";

interface DisplayPosition<T extends ReceiptPosition> {
  position: T;
  originalIndex: number;
}

const fuseOptions: IFuseOptions<DisplayPosition<ReceiptPosition>> = {
  keys: ["position.name"],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export const searchPositionsForDisplay = <T extends ReceiptPosition>(
  positions: T[],
  query: string,
): DisplayPosition<T>[] => {
  const indexed = positions.map((position, originalIndex) => ({
    position,
    originalIndex,
  }));

  const normalizedQuery = query.trim();
  const filtered = !normalizedQuery
    ? indexed
    : normalizedQuery.length === 1
      ? indexed.filter(({ position }) =>
          position.name.toLowerCase().includes(normalizedQuery.toLowerCase()),
        )
      : new Fuse<DisplayPosition<T>>(indexed, fuseOptions)
          .search(normalizedQuery)
          .map((result) => result.item);

  return filtered.sort((left, right) => {
    const byFill = comparePositionsByFillState(left.position, right.position);
    return byFill !== 0 ? byFill : left.originalIndex - right.originalIndex;
  });
};
