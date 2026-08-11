import type { EntryPatch } from "./overlay";
import {
  isEntryStatus,
  isMarkColor,
  parseOptionalFill,
  parseOptionalSide,
  parseOverlayDocument,
  parseOverlayEntry,
  parseTailTip,
} from "./parse-overlay";
import {
  asFilledString,
  asFiniteNumber,
  asRecord,
  asString,
} from "./parse-values";
import {
  REJECTION_REASONS,
  ROOM_VERSION,
  addEntryMessage,
  entryAddedMessage,
  entryPatchedMessage,
  entryRemovedMessage,
  helloMessage,
  patchEntryMessage,
  presenceMessage,
  rejectedMessage,
  removeEntryMessage,
  snapshotMessage,
  type ClientToRoomMessage,
  type ReaderPresence,
  type RejectionReason,
  type RoomToClientMessage,
} from "./room";

function versionedRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  return record === null || record.version !== ROOM_VERSION ? null : record;
}

export function parseReaderPresence(value: unknown): ReaderPresence | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const id = asFilledString(record.id);
  const displayName = asString(record.displayName);
  return id === null || displayName === null ? null : { id, displayName };
}

function parseReaderList(value: unknown): ReaderPresence[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const readers: ReaderPresence[] = [];
  for (const candidate of value) {
    const reader = parseReaderPresence(candidate);
    if (reader === null) {
      return null;
    }
    readers.push(reader);
  }
  return readers;
}

// Absent stays absent: a patch that names no field must not clear the others.
export function parseEntryPatch(value: unknown): EntryPatch | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const patch: EntryPatch = {};

  if (record.body !== undefined) {
    const body = asString(record.body);
    if (body === null) {
      return null;
    }
    patch.body = body;
  }
  if (record.color !== undefined) {
    if (!isMarkColor(record.color)) {
      return null;
    }
    patch.color = record.color;
  }
  if (record.status !== undefined) {
    if (!isEntryStatus(record.status)) {
      return null;
    }
    patch.status = record.status;
  }
  if (record.offsetX !== undefined) {
    const offsetX = asFiniteNumber(record.offsetX);
    if (offsetX === null) {
      return null;
    }
    patch.offsetX = offsetX;
  }
  if (record.offsetY !== undefined) {
    const offsetY = asFiniteNumber(record.offsetY);
    if (offsetY === null) {
      return null;
    }
    patch.offsetY = offsetY;
  }
  if (record.fill !== undefined) {
    const fill = parseOptionalFill(record.fill);
    if (record.fill !== null && fill === null) {
      return null;
    }
    patch.fill = fill;
  }
  if (record.width !== undefined) {
    const width = parseOptionalSide(record.width);
    if (record.width !== null && width === null) {
      return null;
    }
    patch.width = width;
  }
  if (record.height !== undefined) {
    const height = parseOptionalSide(record.height);
    if (record.height !== null && height === null) {
      return null;
    }
    patch.height = height;
  }
  if (record.tail !== undefined) {
    if (record.tail !== null && parseTailTip(record.tail) === null) {
      return null;
    }
    patch.tail = parseTailTip(record.tail);
  }
  return patch;
}

export function parseClientToRoomMessage(
  value: unknown,
): ClientToRoomMessage | null {
  const record = versionedRecord(value);
  if (record === null) {
    return null;
  }

  if (record.type === "hello") {
    const reader = parseReaderPresence(record.reader);
    return reader === null ? null : helloMessage(reader);
  }
  if (record.type === "add-entry") {
    const entry = parseOverlayEntry(record.entry);
    return entry === null ? null : addEntryMessage(entry);
  }
  if (record.type === "patch-entry") {
    const id = asFilledString(record.id);
    const patch = parseEntryPatch(record.patch);
    return id === null || patch === null ? null : patchEntryMessage(id, patch);
  }
  if (record.type === "remove-entry") {
    const id = asFilledString(record.id);
    return id === null ? null : removeEntryMessage(id);
  }
  return null;
}

function isRejectionReason(value: unknown): value is RejectionReason {
  return REJECTION_REASONS.some((reason) => reason === value);
}

export function parseRoomToClientMessage(
  value: unknown,
): RoomToClientMessage | null {
  const record = versionedRecord(value);
  if (record === null) {
    return null;
  }

  if (record.type === "snapshot") {
    const overlay = parseOverlayDocument(record.overlay);
    const readers = parseReaderList(record.readers);
    if (overlay === null || readers === null) {
      return null;
    }
    if (typeof record.canWrite !== "boolean") {
      return null;
    }
    return snapshotMessage({ overlay, readers, canWrite: record.canWrite });
  }
  if (record.type === "entry-added" || record.type === "entry-patched") {
    const entry = parseOverlayEntry(record.entry);
    if (entry === null) {
      return null;
    }
    return record.type === "entry-added"
      ? entryAddedMessage(entry)
      : entryPatchedMessage(entry);
  }
  if (record.type === "entry-removed") {
    const id = asFilledString(record.id);
    return id === null ? null : entryRemovedMessage(id);
  }
  if (record.type === "presence") {
    const readers = parseReaderList(record.readers);
    return readers === null ? null : presenceMessage(readers);
  }
  if (record.type === "rejected") {
    // Absent stays null: a room too old to name the entry still rejects.
    return isRejectionReason(record.reason)
      ? rejectedMessage(record.reason, asFilledString(record.id))
      : null;
  }
  return null;
}
