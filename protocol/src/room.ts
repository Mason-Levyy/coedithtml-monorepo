import type { EntryPatch, OverlayDocument, OverlayEntry } from "./overlay";

export const ROOM_VERSION = 1;

export const UNLOCK_QUERY_PARAM = "u";

type Versioned = { version: typeof ROOM_VERSION };

export type ReaderPresence = { id: string; displayName: string };

export type ClientHelloMessage = Versioned & {
  type: "hello";
  reader: ReaderPresence;
};

export type ClientAddEntryMessage = Versioned & {
  type: "add-entry";
  entry: OverlayEntry;
};

export type ClientPatchEntryMessage = Versioned & {
  type: "patch-entry";
  id: string;
  patch: EntryPatch;
};

export type ClientRemoveEntryMessage = Versioned & {
  type: "remove-entry";
  id: string;
};

export type ClientToRoomMessage =
  | ClientHelloMessage
  | ClientAddEntryMessage
  | ClientPatchEntryMessage
  | ClientRemoveEntryMessage;

export type RoomSnapshotMessage = Versioned & {
  type: "snapshot";
  overlay: OverlayDocument;
  readers: ReaderPresence[];
  canWrite: boolean;
  canEdit: boolean;
};

export type RoomEntryAddedMessage = Versioned & {
  type: "entry-added";
  entry: OverlayEntry;
};

export type RoomEntryPatchedMessage = Versioned & {
  type: "entry-patched";
  entry: OverlayEntry;
};

export type RoomEntryRemovedMessage = Versioned & {
  type: "entry-removed";
  id: string;
};

export type RoomPresenceMessage = Versioned & {
  type: "presence";
  readers: ReaderPresence[];
};

export const REJECTION_REASONS = [
  "read-only",
  "malformed",
  "unknown-entry",
  "limit-reached",
  "too-long",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export type RoomRejectedMessage = Versioned & {
  type: "rejected";
  reason: RejectionReason;
  id: string | null;
};

export type RoomToClientMessage =
  | RoomSnapshotMessage
  | RoomEntryAddedMessage
  | RoomEntryPatchedMessage
  | RoomEntryRemovedMessage
  | RoomPresenceMessage
  | RoomRejectedMessage;

export function helloMessage(reader: ReaderPresence): ClientHelloMessage {
  return { version: ROOM_VERSION, type: "hello", reader };
}

export function addEntryMessage(entry: OverlayEntry): ClientAddEntryMessage {
  return { version: ROOM_VERSION, type: "add-entry", entry };
}

export function patchEntryMessage(
  id: string,
  patch: EntryPatch,
): ClientPatchEntryMessage {
  return { version: ROOM_VERSION, type: "patch-entry", id, patch };
}

export function removeEntryMessage(id: string): ClientRemoveEntryMessage {
  return { version: ROOM_VERSION, type: "remove-entry", id };
}

export function snapshotMessage(options: {
  overlay: OverlayDocument;
  readers: ReaderPresence[];
  canWrite: boolean;
  canEdit: boolean;
}): RoomSnapshotMessage {
  return { version: ROOM_VERSION, type: "snapshot", ...options };
}

export function entryAddedMessage(entry: OverlayEntry): RoomEntryAddedMessage {
  return { version: ROOM_VERSION, type: "entry-added", entry };
}

export function entryPatchedMessage(
  entry: OverlayEntry,
): RoomEntryPatchedMessage {
  return { version: ROOM_VERSION, type: "entry-patched", entry };
}

export function entryRemovedMessage(id: string): RoomEntryRemovedMessage {
  return { version: ROOM_VERSION, type: "entry-removed", id };
}

export function presenceMessage(
  readers: ReaderPresence[],
): RoomPresenceMessage {
  return { version: ROOM_VERSION, type: "presence", readers };
}

export function rejectedMessage(
  reason: RejectionReason,
  id: string | null = null,
): RoomRejectedMessage {
  return { version: ROOM_VERSION, type: "rejected", reason, id };
}
