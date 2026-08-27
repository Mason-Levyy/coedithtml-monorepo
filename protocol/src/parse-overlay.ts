import { normalizeHex } from "./colors";
import { parseAnchor } from "./parse-anchor";
import {
  clampStickySize,
  DEFAULT_STICKY_TEXT_SIZE,
  MARK_COLORS,
  OVERLAY_VERSION,
  STICKY_TEXT_SIZES,
  type Author,
  type CommentEntry,
  type EditEntry,
  type EntryStatus,
  type MarkColor,
  type OverlayDocument,
  type OverlayEntry,
  type ReplyEntry,
  type StickyEntry,
  type StickyTextSize,
  type TailTip,
} from "./overlay";
import {
  asFilledString,
  asFiniteNumber,
  asRecord,
  asString,
} from "./parse-values";

const ENTRY_STATUSES: readonly EntryStatus[] = ["open", "resolved"];

export function isEntryStatus(value: unknown): value is EntryStatus {
  return ENTRY_STATUSES.some((status) => status === value);
}

export function isMarkColor(value: unknown): value is MarkColor {
  return MARK_COLORS.some((color) => color === value);
}

export function isStickyTextSize(value: unknown): value is StickyTextSize {
  return STICKY_TEXT_SIZES.some((size) => size === value);
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

export function parseOptionalFill(value: unknown): string | null {
  return value === undefined || value === null ? null : normalizeHex(value);
}

type SharedFields = Omit<CommentEntry, "kind" | "parentId">;

function parseSharedFields(
  record: Record<string, unknown>,
): SharedFields | null {
  const id = asFilledString(record.id);
  const body = asString(record.body);
  const createdAt = asFilledString(record.createdAt);
  const anchor = parseAnchor(record.anchor);
  const author = parseAuthor(record.author);
  const fill = parseOptionalFill(record.fill);

  if (
    id === null ||
    body === null ||
    createdAt === null ||
    anchor === null ||
    author === null ||
    (record.fill !== undefined && record.fill !== null && fill === null) ||
    !isMarkColor(record.color) ||
    !isEntryStatus(record.status)
  ) {
    return null;
  }
  return {
    id,
    anchor,
    body,
    author,
    color: record.color,
    fill,
    status: record.status,
    createdAt,
  };
}

function isUnparented(value: unknown): boolean {
  return value === null || value === undefined;
}

function parseReply(
  record: Record<string, unknown>,
  shared: SharedFields,
): ReplyEntry | null {
  const parentId = asFilledString(record.parentId);
  return parentId === null ? null : { ...shared, kind: "reply", parentId };
}

export function parseOptionalSide(value: unknown): number | null {
  return value === undefined || value === null ? null : asFiniteNumber(value);
}

export function parseTailTip(value: unknown): TailTip | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const x = asFiniteNumber(record.x);
  const y = asFiniteNumber(record.y);
  return x === null || y === null ? null : { x, y };
}

function parseSticky(
  record: Record<string, unknown>,
  shared: SharedFields,
): StickyEntry | null {
  const offsetX = asFiniteNumber(record.offsetX);
  const offsetY = asFiniteNumber(record.offsetY);
  const width = parseOptionalSide(record.width);
  const height = parseOptionalSide(record.height);
  if (
    offsetX === null ||
    offsetY === null ||
    (record.width !== undefined && record.width !== null && width === null) ||
    (record.height !== undefined &&
      record.height !== null &&
      height === null) ||
    !isUnparented(record.parentId)
  ) {
    return null;
  }
  return {
    ...shared,
    kind: "sticky",
    parentId: null,
    offsetX,
    offsetY,
    ...clampStickySize({ width, height }),
    tail: parseTailTip(record.tail),
    textSize: isStickyTextSize(record.textSize)
      ? record.textSize
      : DEFAULT_STICKY_TEXT_SIZE,
  };
}

function parseEdit(
  record: Record<string, unknown>,
  shared: SharedFields,
): EditEntry | null {
  const rev = asFiniteNumber(record.rev);
  if (
    rev === null ||
    !Number.isInteger(rev) ||
    rev < 0 ||
    !isUnparented(record.parentId) ||
    shared.anchor.kind !== "text"
  ) {
    return null;
  }
  return { ...shared, kind: "edit", parentId: null, rev };
}

export function parseOverlayEntry(value: unknown): OverlayEntry | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const shared = parseSharedFields(record);
  if (shared === null) {
    return null;
  }

  if (record.kind === "reply") {
    return parseReply(record, shared);
  }
  if (record.kind === "sticky") {
    return parseSticky(record, shared);
  }
  if (record.kind === "edit") {
    return parseEdit(record, shared);
  }
  if (record.kind === "comment" && isUnparented(record.parentId)) {
    return { ...shared, kind: "comment", parentId: null };
  }
  return null;
}

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
