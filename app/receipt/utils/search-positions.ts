import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import { ReceiptPosition } from "@/model/receipt/model";

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

  if (!normalizedQuery) {
    return indexed;
  }

  if (normalizedQuery.length === 1) {
    return indexed.filter(({ position }) =>
      position.name.toLowerCase().includes(normalizedQuery.toLowerCase()),
    );
  }

  return new Fuse<DisplayPosition<T>>(indexed, fuseOptions)
    .search(normalizedQuery)
    .map((result) => result.item);
};
