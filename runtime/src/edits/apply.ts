import {
  resolveAnchorInText,
  type EditEntry,
  type TextAnchor,
} from "@coedithtml/protocol";
import { buildTextIndex, type TextIndex } from "../dom/text-index";

type Splice = { node: Text; from: number; to: number };

export type EditOutcome = { applied: string[]; unplaced: string[] };

function segmentHolding(index: TextIndex, offset: number) {
  return index.segments.find(
    (segment) =>
      offset >= segment.textOffset &&
      offset <= segment.textOffset + segment.length,
  );
}

function spliceFor(
  index: TextIndex,
  start: number,
  end: number,
): Splice | null {
  const opening = segmentHolding(index, start);
  const closing = segmentHolding(index, end);
  if (
    opening === undefined ||
    closing === undefined ||
    opening.node !== closing.node
  ) {
    return null;
  }
  return {
    node: opening.node,
    from: opening.dataOffset + (start - opening.textOffset),
    to: closing.dataOffset + (end - closing.textOffset),
  };
}

function applyOne(index: TextIndex, entry: EditEntry): boolean {
  const found = resolveAnchorInText(index.text, entry.anchor as TextAnchor);
  if (!found.ok) {
    return false;
  }
  const splice = spliceFor(index, found.start, found.end);
  if (splice === null) {
    return false;
  }
  const { node, from, to } = splice;
  node.data = node.data.slice(0, from) + entry.body + node.data.slice(to);
  return true;
}

export function applyEdits(root: HTMLElement, edits: EditEntry[]): EditOutcome {
  const applied: string[] = [];
  const unplaced: string[] = [];

  for (const entry of edits) {
    if (applyOne(buildTextIndex(root), entry)) {
      applied.push(entry.id);
    } else {
      unplaced.push(entry.id);
    }
  }

  return { applied, unplaced };
}
