import {
  entryAddedMessage,
  entryPatchedMessage,
  entryRemovedMessage,
  patchEntry,
  type ClientToRoomMessage,
  type OverlayEntry,
  type RejectionReason,
  type RoomToClientMessage,
} from "@coedithtml/protocol";

export const MAX_ENTRIES_PER_ROOM = 500;

export const MAX_BODY_LENGTH = 4000;

export type EntryStore = {
  list(): OverlayEntry[];
  get(id: string): OverlayEntry | null;
  put(entry: OverlayEntry): void;
  remove(id: string): void;
  count(): number;
};

export type LogOutcome =
  | { ok: true; broadcast: RoomToClientMessage }
  | { ok: false; reason: RejectionReason };

function rejected(reason: RejectionReason): LogOutcome {
  return { ok: false, reason };
}

function addEntry(
  store: EntryStore,
  entry: OverlayEntry,
  now: string,
): LogOutcome {
  const existing = store.get(entry.id);
  // A reconnecting client resends what it never saw acknowledged.
  if (existing !== null) {
    return { ok: true, broadcast: entryAddedMessage(existing) };
  }
  if (entry.body.length > MAX_BODY_LENGTH) {
    return rejected("too-long");
  }
  if (store.count() >= MAX_ENTRIES_PER_ROOM) {
    return rejected("limit-reached");
  }
  if (entry.kind === "reply" && store.get(entry.parentId) === null) {
    return rejected("unknown-entry");
  }

  const stamped: OverlayEntry = { ...entry, createdAt: now };
  store.put(stamped);
  return { ok: true, broadcast: entryAddedMessage(stamped) };
}

function patchStoredEntry(
  store: EntryStore,
  id: string,
  message: Extract<ClientToRoomMessage, { type: "patch-entry" }>,
): LogOutcome {
  const existing = store.get(id);
  if (existing === null) {
    return rejected("unknown-entry");
  }
  if (
    message.patch.body !== undefined &&
    message.patch.body.length > MAX_BODY_LENGTH
  ) {
    return rejected("too-long");
  }

  const patched = patchEntry(existing, message.patch);
  if (patched === null) {
    return rejected("malformed");
  }
  store.put(patched);
  return { ok: true, broadcast: entryPatchedMessage(patched) };
}

function removeEntry(store: EntryStore, id: string): LogOutcome {
  if (store.get(id) === null) {
    return rejected("unknown-entry");
  }
  for (const entry of store.list()) {
    if (entry.kind === "reply" && entry.parentId === id) {
      store.remove(entry.id);
    }
  }
  store.remove(id);
  return { ok: true, broadcast: entryRemovedMessage(id) };
}

export function applyClientMessage(
  store: EntryStore,
  message: ClientToRoomMessage,
  now: string,
): LogOutcome | null {
  switch (message.type) {
    case "hello":
      return null;
    case "add-entry":
      return addEntry(store, message.entry, now);
    case "patch-entry":
      return patchStoredEntry(store, message.id, message);
    case "remove-entry":
      return removeEntry(store, message.id);
  }
}
