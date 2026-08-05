import type { Anchor } from "./anchor";

export const OVERLAY_VERSION = 1;

// `source` exists from day one so accounts add a value later, not a migration.
export type Author = {
  id: string;
  displayName: string;
  source: "anonymous";
};

export type EntryKind = "comment" | "reply";

export type EntryStatus = "open" | "resolved";

export type OverlayEntry = {
  id: string;
  parentId: string | null;
  anchor: Anchor;
  kind: EntryKind;
  body: string;
  author: Author;
  status: EntryStatus;
  createdAt: string;
};

export type OverlayDocument = {
  version: typeof OVERLAY_VERSION;
  artifactRevision: string;
  entries: OverlayEntry[];
};

export function emptyOverlay(artifactRevision: string): OverlayDocument {
  return { version: OVERLAY_VERSION, artifactRevision, entries: [] };
}

export function unresolvedCount(overlay: OverlayDocument): number {
  return overlay.entries.filter(
    (entry) => entry.kind === "comment" && entry.status === "open",
  ).length;
}
