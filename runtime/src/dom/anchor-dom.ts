import {
  anchorFromText,
  regionAnchor,
  resolveAnchorInText,
  type RegionAnchor,
  type TextAnchor,
} from "@coedithtml/protocol";
import { OVERLAY_HOST_ATTRIBUTE } from "./constants";
import { elementForPath, pathToElement, sharedPathDepth } from "./element-path";
import { offsetsForRange, rangeForOffsets, type TextIndex } from "./text-index";

function elementOf(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function pathOfRange(index: TextIndex, start: number, end: number): string {
  const range = rangeForOffsets(index, start, end);
  const element =
    range === null ? null : elementOf(range.commonAncestorContainer);
  return element === null ? "" : pathToElement(element);
}

export function anchorFromRange(
  index: TextIndex,
  range: Range,
  revision: string,
): TextAnchor | null {
  const offsets = offsetsForRange(index, range);
  if (offsets === null) {
    return null;
  }
  return anchorFromText({
    text: index.text,
    start: offsets.start,
    end: offsets.end,
    path: pathOfRange(index, offsets.start, offsets.end),
    revision,
  });
}

function pickByPath(
  index: TextIndex,
  anchor: TextAnchor,
  matches: number[],
): number | null {
  const best = matches.reduce(
    (winners: { depth: number; at: number[] }, at) => {
      const depth = sharedPathDepth(
        pathOfRange(index, at, at + anchor.quote.length),
        anchor.path,
      );
      if (depth > winners.depth) {
        return { depth, at: [at] };
      }
      if (depth === winners.depth) {
        winners.at.push(at);
      }
      return winners;
    },
    { depth: -1, at: [] },
  );
  return best.at.length === 1 ? (best.at[0] ?? null) : null;
}

export function rangeForTextAnchor(
  index: TextIndex,
  anchor: TextAnchor,
): Range | null {
  const resolution = resolveAnchorInText(index.text, anchor);
  if (resolution.ok) {
    return rangeForOffsets(index, resolution.start, resolution.end);
  }
  if (resolution.reason === "orphaned") {
    return null;
  }
  const chosen = pickByPath(index, anchor, resolution.matches);
  return chosen === null
    ? null
    : rangeForOffsets(index, chosen, chosen + anchor.quote.length);
}

function clampFraction(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function regionAnchorAtPoint(
  x: number,
  y: number,
  revision: string,
): RegionAnchor | null {
  const element = document.elementFromPoint(x, y);
  // Our own host is what a click on a painted mark reports through the shadow.
  if (element === null || element.hasAttribute(OVERLAY_HOST_ATTRIBUTE)) {
    return null;
  }
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) {
    return null;
  }
  return regionAnchor({
    path: pathToElement(element),
    fractionX: clampFraction((x - box.left) / box.width),
    fractionY: clampFraction((y - box.top) / box.height),
    revision,
  });
}

export function pointForRegionAnchor(
  anchor: RegionAnchor,
): { x: number; y: number } | null {
  const element = elementForPath(anchor.path);
  if (element === null) {
    return null;
  }
  const box = element.getBoundingClientRect();
  return {
    x: box.left + box.width * anchor.fractionX,
    y: box.top + box.height * anchor.fractionY,
  };
}
