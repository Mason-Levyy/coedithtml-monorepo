import type { Anchor } from "./anchor";

export const OVERLAY_VERSION = 1;

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
  fill: string | null;
  status: EntryStatus;
  createdAt: string;
};

export type CommentEntry = EntryBase & { kind: "comment"; parentId: null };

export type ReplyEntry = EntryBase & { kind: "reply"; parentId: string };

export type TailTip = { x: number; y: number };

export type StickyEntry = EntryBase & {
  kind: "sticky";
  parentId: null;
  offsetX: number;
  offsetY: number;
  width: number | null;
  height: number | null;
  tail: TailTip | null;
};

export const MIN_STICKY_WIDTH = 120;
export const MIN_STICKY_HEIGHT = 40;
export const MAX_STICKY_WIDTH = 800;
export const MAX_STICKY_HEIGHT = 2000;

function clampSide(
  value: number | null,
  min: number,
  max: number,
): number | null {
  return value === null ? null : Math.min(Math.max(value, min), max);
}

export function clampStickySize(size: {
  width: number | null;
  height: number | null;
}): { width: number | null; height: number | null } {
  return {
    width: clampSide(size.width, MIN_STICKY_WIDTH, MAX_STICKY_WIDTH),
    height: clampSide(size.height, MIN_STICKY_HEIGHT, MAX_STICKY_HEIGHT),
  };
}

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
  fill?: string | null;
  status?: EntryStatus;
  offsetX?: number;
  offsetY?: number;
  width?: number | null;
  height?: number | null;
  tail?: TailTip | null;
};

function movesOrPoints(patch: EntryPatch): boolean {
  return (
    patch.offsetX !== undefined ||
    patch.offsetY !== undefined ||
    patch.width !== undefined ||
    patch.height !== undefined ||
    patch.tail !== undefined
  );
}

export function patchEntry(
  entry: OverlayEntry,
  patch: EntryPatch,
): OverlayEntry | null {
  const shared = {
    body: patch.body ?? entry.body,
    color: patch.color ?? entry.color,
    fill: patch.fill === undefined ? entry.fill : patch.fill,
    status: patch.status ?? entry.status,
  };

  if (isFloating(entry)) {
    const size = clampStickySize({
      width: patch.width === undefined ? entry.width : patch.width,
      height: patch.height === undefined ? entry.height : patch.height,
    });
    return {
      ...entry,
      ...shared,
      ...size,
      offsetX: patch.offsetX ?? entry.offsetX,
      offsetY: patch.offsetY ?? entry.offsetY,
      tail: patch.tail === undefined ? entry.tail : patch.tail,
    };
  }
  if (movesOrPoints(patch)) {
    return null;
  }
  return { ...entry, ...shared };
}
