import type {
  Anchor,
  Author,
  CommentEntry,
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

// The room stamps its own createdAt; this one only orders an unsent entry.
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

export function newSticky(
  draft: Draft & { offsetX: number; offsetY: number },
): StickyEntry {
  return {
    ...shared(draft),
    kind: "sticky",
    parentId: null,
    offsetX: draft.offsetX,
    offsetY: draft.offsetY,
    width: null,
    height: null,
    tail: null,
  };
}
