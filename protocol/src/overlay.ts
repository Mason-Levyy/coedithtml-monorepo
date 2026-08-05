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

export type EntryKind = OverlayEntry["kind"];

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

export function hasTail(entry: OverlayEntry): boolean {
  return isFloating(entry) && entry.tail !== null;
}

export function unresolvedCount(overlay: OverlayDocument): number {
  return overlay.entries.filter(
    (entry) => entry.kind !== "reply" && entry.status === "open",
  ).length;
}

export function repliesTo(
  overlay: OverlayDocument,
  parentId: string,
): ReplyEntry[] {
  return overlay.entries.filter(
    (entry): entry is ReplyEntry =>
      entry.kind === "reply" && entry.parentId === parentId,
  );
}

export type Point = { x: number; y: number };

export type Box = Point & { width: number; height: number };

// PowerPoint's gesture: dragging the tip back inside the box retracts the tail.
export function tailIsRetracted(box: Box, tip: Point): boolean {
  return (
    tip.x >= box.x &&
    tip.x <= box.x + box.width &&
    tip.y >= box.y &&
    tip.y <= box.y + box.height
  );
}
