import type {
  Anchor,
  Author,
  CommentEntry,
  EditEntry,
  MarkColor,
  ReaderPresence,
  ReplyEntry,
  StickyEntry,
} from "@/lib/protocol";

function authorFrom(reader: ReaderPresence): Author {
  return {
    id: reader.id,
    displayName: reader.displayName,
    source: "anonymous",
  };
}

type Draft = {
  anchor: Anchor;
  body: string;
  reader: ReaderPresence;
  color: MarkColor;
  fill?: string | null;
};

function shared(draft: Draft) {
  return {
    id: crypto.randomUUID(),
    anchor: draft.anchor,
    body: draft.body,
    author: authorFrom(draft.reader),
    color: draft.color,
    fill: draft.fill ?? null,
    status: "open" as const,
    createdAt: new Date().toISOString(),
  };
}

export function newComment(draft: Draft): CommentEntry {
  return { ...shared(draft), kind: "comment", parentId: null };
}

export function newReply(draft: Draft & { parentId: string }): ReplyEntry {
  return { ...shared(draft), kind: "reply", parentId: draft.parentId };
}

export function newEdit(draft: Draft): EditEntry {
  return { ...shared(draft), kind: "edit", parentId: null, rev: 0 };
}

export function newSticky(
  draft: Draft & {
    offsetX: number;
    offsetY: number;
    width?: number | null;
    height?: number | null;
  },
): StickyEntry {
  return {
    ...shared(draft),
    kind: "sticky",
    parentId: null,
    offsetX: draft.offsetX,
    offsetY: draft.offsetY,
    width: draft.width !== undefined ? draft.width : 180,
    height: draft.height !== undefined ? draft.height : 140,
    tail: null,
  };
}
