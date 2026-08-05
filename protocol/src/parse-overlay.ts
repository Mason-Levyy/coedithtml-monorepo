import type { Anchor } from "./anchor";
import {
  OVERLAY_VERSION,
  type Author,
  type EntryKind,
  type EntryStatus,
  type OverlayDocument,
  type OverlayEntry,
} from "./overlay";

const ENTRY_KINDS: readonly EntryKind[] = ["comment", "reply"];
const ENTRY_STATUSES: readonly EntryStatus[] = ["open", "resolved"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asFilledString(value: unknown): string | null {
  const text = asString(value);
  return text !== null && text.length > 0 ? text : null;
}

function isEntryKind(value: unknown): value is EntryKind {
  return ENTRY_KINDS.some((kind) => kind === value);
}

function isEntryStatus(value: unknown): value is EntryStatus {
  return ENTRY_STATUSES.some((status) => status === value);
}

export function parseAnchor(value: unknown): Anchor | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const quote = asFilledString(record.quote);
  const prefix = asString(record.prefix);
  const suffix = asString(record.suffix);
  const path = asString(record.path);
  const revision = asFilledString(record.revision);
  if (
    quote === null ||
    prefix === null ||
    suffix === null ||
    path === null ||
    revision === null
  ) {
    return null;
  }
  return { quote, prefix, suffix, path, revision };
}

function parseAuthor(value: unknown): Author | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const id = asFilledString(record.id);
  const displayName = asString(record.displayName);
  if (id === null || displayName === null || record.source !== "anonymous") {
    return null;
  }
  return { id, displayName, source: "anonymous" };
}

type ParsedParent = { ok: true; parentId: string | null } | { ok: false };

// Absent and malformed have to stay distinguishable, or a broken parentId
// silently promotes a reply to a top-level comment.
function parseParentId(value: unknown): ParsedParent {
  if (value === null || value === undefined) {
    return { ok: true, parentId: null };
  }
  const parentId = asFilledString(value);
  return parentId === null ? { ok: false } : { ok: true, parentId };
}

export function parseOverlayEntry(value: unknown): OverlayEntry | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }

  const id = asFilledString(record.id);
  const body = asString(record.body);
  const createdAt = asFilledString(record.createdAt);
  const anchor = parseAnchor(record.anchor);
  const author = parseAuthor(record.author);
  const parent = parseParentId(record.parentId);

  if (
    id === null ||
    body === null ||
    createdAt === null ||
    anchor === null ||
    author === null ||
    !parent.ok ||
    !isEntryKind(record.kind) ||
    !isEntryStatus(record.status)
  ) {
    return null;
  }

  return {
    id,
    parentId: parent.parentId,
    anchor,
    kind: record.kind,
    body,
    author,
    status: record.status,
    createdAt,
  };
}

// One bad entry fails the whole document: dropping it would silently lose
// somebody's comment, which is worse than refusing to load.
export function parseOverlayDocument(value: unknown): OverlayDocument | null {
  const record = asRecord(value);
  if (record === null || record.version !== OVERLAY_VERSION) {
    return null;
  }
  const artifactRevision = asFilledString(record.artifactRevision);
  if (artifactRevision === null || !Array.isArray(record.entries)) {
    return null;
  }

  const entries: OverlayEntry[] = [];
  for (const candidate of record.entries) {
    const entry = parseOverlayEntry(candidate);
    if (entry === null) {
      return null;
    }
    entries.push(entry);
  }
  return { version: OVERLAY_VERSION, artifactRevision, entries };
}
