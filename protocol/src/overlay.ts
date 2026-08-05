import type { Anchor } from "./anchor";

export const OVERLAY_VERSION = 1;

// `source` exists from day one so accounts add a value later, not a migration.
export type Author = {
  id: string;
  displayName: string;
  source: "anonymous";
};

export const MARK_COLORS = [
  "yellow",
  "pink",
  "green",
  "blue",
  "purple",
  "orange",
] as const;

export type MarkColor = (typeof MARK_COLORS)[number];

export const DEFAULT_MARK_COLOR: MarkColor = "yellow";

export type EntryStatus = "open" | "resolved";

type EntryBase = {
  id: string;
  parentId: string | null;
  anchor: Anchor;
  body: string;
  author: Author;
  color: MarkColor;
  status: EntryStatus;
  createdAt: string;
};

export type CommentEntry = EntryBase & { kind: "comment"; parentId: null };

export type ReplyEntry = EntryBase & { kind: "reply"; parentId: string };

// A callout is a sticky whose tail is set, so there is no third kind.
export type StickyEntry = EntryBase & {
  kind: "sticky";
  parentId: null;
  offsetX: number;
  offsetY: number;
  tail: Anchor | null;
};

export type OverlayEntry = CommentEntry | ReplyEntry | StickyEntry;

export type OverlayDocument = {
  version: typeof OVERLAY_VERSION;
  artifactRevision: string;
  entries: OverlayEntry[];
};

export function emptyOverlay(artifactRevision: string): OverlayDocument {
  return { version: OVERLAY_VERSION, artifactRevision, entries: [] };
}

export function isFloating(entry: OverlayEntry): entry is StickyEntry {
  return entry.kind === "sticky";
}

export function threadsIn(entries: OverlayEntry[]): OverlayEntry[] {
  return entries.filter((entry) => entry.kind !== "reply");
}

export function unresolvedCount(entries: OverlayEntry[]): number {
  return threadsIn(entries).filter((entry) => entry.status === "open").length;
}

export function repliesTo(
  entries: OverlayEntry[],
  parentId: string,
): ReplyEntry[] {
  return entries.filter(
    (entry): entry is ReplyEntry =>
      entry.kind === "reply" && entry.parentId === parentId,
  );
}

export type EntryPatch = {
  body?: string;
  color?: MarkColor;
  status?: EntryStatus;
  offsetX?: number;
  offsetY?: number;
  tail?: Anchor | null;
};

function movesOrPoints(patch: EntryPatch): boolean {
  return (
    patch.offsetX !== undefined ||
    patch.offsetY !== undefined ||
    patch.tail !== undefined
  );
}

// An absent field means untouched, so `tail: null` stays available as "retract".
export function patchEntry(
  entry: OverlayEntry,
  patch: EntryPatch,
): OverlayEntry | null {
  const body = patch.body ?? entry.body;
  const color = patch.color ?? entry.color;
  const status = patch.status ?? entry.status;

  if (isFloating(entry)) {
    return {
      ...entry,
      body,
      color,
      status,
      offsetX: patch.offsetX ?? entry.offsetX,
      offsetY: patch.offsetY ?? entry.offsetY,
      tail: patch.tail === undefined ? entry.tail : patch.tail,
    };
  }
  if (movesOrPoints(patch)) {
    return null;
  }
  return { ...entry, body, color, status };
}
