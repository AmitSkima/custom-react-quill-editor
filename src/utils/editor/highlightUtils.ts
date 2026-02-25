import type { Delta } from "quill";

/**
 * Returns all [index, length] ranges in the delta where the search text appears.
 * Indices are in Delta document space (embeds count as 1).
 */
export function findTextRangesInDelta(
  delta: Delta,
  searchText: string,
): Array<{ index: number; length: number }> {
  if (!searchText) return [];

  const ops = delta.ops ?? [];
  let plainText = "";
  const deltaIndexForChar: number[] = [];
  let deltaIndex = 0;
  for (const op of ops) {
    const insert = op.insert;
    if (typeof insert === "string") {
      for (let i = 0; i < insert.length; i++) {
        plainText += insert[i];
        deltaIndexForChar.push(deltaIndex);
        deltaIndex++;
      }
    } else {
      deltaIndex++;
    }
  }

  const ranges: Array<{ index: number; length: number }> = [];
  let start = 0;
  while (true) {
    const pos = plainText.indexOf(searchText, start);
    if (pos === -1) break;
    const len = searchText.length;
    const index = deltaIndexForChar[pos];
    const endPos = pos + len - 1;
    const length = deltaIndexForChar[endPos] - index + 1;
    ranges.push({ index, length });
    start = pos + 1;
  }
  return ranges;
}
