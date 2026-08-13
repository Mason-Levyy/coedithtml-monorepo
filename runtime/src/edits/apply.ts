import {
  resolveAnchorInText,
  type EditEntry,
  type TextAnchor,
} from "@coedithtml/protocol";
import type { TextIndex } from "../dom/text-index";

type Splice = {
  id: string;
  node: Text;
  from: number;
  to: number;
  text: string;
};

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
  entry: EditEntry,
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
    id: entry.id,
    node: opening.node,
    from: opening.dataOffset + (start - opening.textOffset),
    to: closing.dataOffset + (end - closing.textOffset),
    text: entry.body,
  };
}

function planAll(index: TextIndex, edits: EditEntry[]): Splice[] {
  const planned: Splice[] = [];
  for (const entry of edits) {
    const found = resolveAnchorInText(index.text, entry.anchor as TextAnchor);
    if (!found.ok) {
      continue;
    }
    const splice = spliceFor(index, entry, found.start, found.end);
    if (splice !== null) {
      planned.push(splice);
    }
  }
  return planned;
}

function withoutOverlaps(planned: Splice[]): Splice[] {
  const kept: Splice[] = [];
  for (const candidate of planned) {
    const clashes = kept.some(
      (held) =>
        held.node === candidate.node &&
        candidate.from < held.to &&
        held.from < candidate.to,
    );
    if (!clashes) {
      kept.push(candidate);
    }
  }
  return kept;
}

export function applyEdits(index: TextIndex, edits: EditEntry[]): EditOutcome {
  const kept = withoutOverlaps(planAll(index, edits));
  const applied = new Set(kept.map(({ id }) => id));

  for (const { node, from, to, text } of [...kept].sort(
    (a, b) => b.from - a.from,
  )) {
    node.data = node.data.slice(0, from) + text + node.data.slice(to);
  }

  return {
    applied: edits.filter(({ id }) => applied.has(id)).map(({ id }) => id),
    unplaced: edits.filter(({ id }) => !applied.has(id)).map(({ id }) => id),
  };
}
