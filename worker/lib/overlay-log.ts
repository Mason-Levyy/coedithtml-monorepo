import {
  entryAddedMessage,
  entryPatchedMessage,
  entryRemovedMessage,
  isEdit,
  patchEntry,
  type ClientToRoomMessage,
  type OverlayEntry,
  type RejectionReason,
  type RoomToClientMessage,
} from "@coedithtml/protocol";
import { entryWithinLimits, MAX_ID_LENGTH } from "@/lib/entry-limits";

export { MAX_BODY_LENGTH } from "@/lib/entry-limits";

export const MAX_ENTRIES_PER_ROOM = 500;

export type EntryStore = {
  list(): OverlayEntry[];
  get(id: string): OverlayEntry | null;
  put(entry: OverlayEntry): void;
  remove(id: string): void;
  count(): number;
};

export type LogOutcome =
  | { ok: true; broadcast: RoomToClientMessage }
  | { ok: false; reason: RejectionReason; id: string | null };

function rejected(reason: RejectionReason, id: string | null): LogOutcome {
  return { ok: false, reason, id };
}

function addEntry(
  store: EntryStore,
  entry: OverlayEntry,
  now: string,
): LogOutcome {
  if (!entryWithinLimits(entry)) {
    return rejected("too-long", entry.id.slice(0, MAX_ID_LENGTH));
  }
  const existing = store.get(entry.id);
  if (existing !== null) {
    return { ok: true, broadcast: entryAddedMessage(existing) };
  }
  if (isEdit(entry) && entry.rev !== 0) {
    return rejected("malformed", entry.id);
  }
  if (store.count() >= MAX_ENTRIES_PER_ROOM) {
    return rejected("limit-reached", entry.id);
  }
  if (entry.kind === "reply" && store.get(entry.parentId) === null) {
    return rejected("unknown-entry", entry.id);
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
  if (id.length > MAX_ID_LENGTH) {
    return rejected("too-long", id.slice(0, MAX_ID_LENGTH));
  }
  const existing = store.get(id);
  if (existing === null) {
    return rejected("unknown-entry", id);
  }
  if (
    message.patch.ifRev !== undefined &&
    (!isEdit(existing) || existing.rev !== message.patch.ifRev)
  ) {
    return rejected("stale", id);
  }

  const patched = patchEntry(existing, message.patch);
  if (patched === null) {
    return rejected("malformed", id);
  }
  // A patch can carry an anchor and a body of its own, so the result is what
  // has to be measured -- checking the patch alone would let a quote through
  // that the entry then keeps.
  if (!entryWithinLimits(patched)) {
    return rejected("too-long", id);
  }
  store.put(patched);
  return { ok: true, broadcast: entryPatchedMessage(patched) };
}

function removeEntry(store: EntryStore, id: string): LogOutcome {
  if (store.get(id) === null) {
    return rejected("unknown-entry", id);
  }
  for (const entry of store.list()) {
    if (entry.kind === "reply" && entry.parentId === id) {
      store.remove(entry.id);
    }
  }
  store.remove(id);
  return { ok: true, broadcast: entryRemovedMessage(id) };
}

export function entryIdIn(message: ClientToRoomMessage): string | null {
  switch (message.type) {
    case "hello":
      return null;
    case "add-entry":
      return message.entry.id;
    case "patch-entry":
    case "remove-entry":
      return message.id;
  }
}

function touchesText(store: EntryStore, message: ClientToRoomMessage): boolean {
  if (message.type === "add-entry") {
    return isEdit(message.entry);
  }
  if (message.type === "patch-entry" || message.type === "remove-entry") {
    const existing = store.get(message.id);
    return existing !== null && isEdit(existing);
  }
  return false;
}

export function applyClientMessage(
  store: EntryStore,
  message: ClientToRoomMessage,
  session: { now: string; canEdit: boolean },
): LogOutcome | null {
  if (!session.canEdit && touchesText(store, message)) {
    return rejected("not-editable", entryIdIn(message));
  }
  switch (message.type) {
    case "hello":
      return null;
    case "add-entry":
      return addEntry(store, message.entry, session.now);
    case "patch-entry":
      return patchStoredEntry(store, message.id, message);
    case "remove-entry":
      return removeEntry(store, message.id);
  }
}
