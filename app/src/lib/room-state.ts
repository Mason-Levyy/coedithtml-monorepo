import {
  patchEntry,
  type EntryPatch,
  type OverlayEntry,
  type ReaderPresence,
  type RejectionReason,
  type RoomToClientMessage,
} from "@/lib/protocol";

// A write is in flight from the moment it is sent until the room echoes it
// back. Anything else the reader is told about their work is a guess.
export type SaveState = "idle" | "saving" | "saved" | "failed";

export type RoomContents = {
  entries: OverlayEntry[];
  readers: ReaderPresence[];
  canWrite: boolean;
  canEdit: boolean;
  rejection: RejectionReason | null;
  loaded: boolean;
  rollback: Record<string, OverlayEntry[]>;
  pending: string[];
  landed: boolean;
  failed: boolean;
};

export const EMPTY_ROOM: RoomContents = {
  entries: [],
  readers: [],
  canWrite: false,
  canEdit: false,
  rejection: null,
  loaded: false,
  rollback: {},
  pending: [],
  landed: false,
  failed: false,
};

export function saveStateOf(state: RoomContents): SaveState {
  if (state.pending.length > 0) {
    return "saving";
  }
  if (state.failed) {
    return "failed";
  }
  return state.landed ? "saved" : "idle";
}

export function writeSent(state: RoomContents, id: string): RoomContents {
  return { ...state, pending: [...state.pending, id], failed: false };
}

export function writesAbandoned(state: RoomContents): RoomContents {
  return state.pending.length === 0
    ? state
    : { ...state, pending: [], failed: true };
}

function settled(
  state: RoomContents,
  id: string,
  outcome: { landed: boolean },
): Pick<RoomContents, "pending" | "landed" | "failed"> {
  return {
    pending: state.pending.filter((held) => held !== id),
    landed: state.landed || outcome.landed,
    failed: outcome.landed ? state.failed : true,
  };
}

function byCreatedAt(a: OverlayEntry, b: OverlayEntry): number {
  if (a.createdAt === b.createdAt) {
    return a.id < b.id ? -1 : 1;
  }
  return a.createdAt < b.createdAt ? -1 : 1;
}

function withEntry(
  entries: OverlayEntry[],
  entry: OverlayEntry,
): OverlayEntry[] {
  const others = entries.filter((existing) => existing.id !== entry.id);
  return [...others, entry].sort(byCreatedAt);
}

function without(
  rollback: RoomContents["rollback"],
  id: string,
): RoomContents["rollback"] {
  return Object.fromEntries(
    Object.entries(rollback).filter(([held]) => held !== id),
  );
}

function threadOf(entries: OverlayEntry[], id: string): OverlayEntry[] {
  return entries.filter((entry) => entry.id === id || entry.parentId === id);
}

function remembering(
  state: RoomContents,
  id: string,
  replaced: OverlayEntry[],
): RoomContents["rollback"] {
  return id in state.rollback
    ? state.rollback
    : { ...state.rollback, [id]: replaced };
}

export function applyLocalPatch(
  state: RoomContents,
  id: string,
  patch: EntryPatch,
): RoomContents {
  const existing = state.entries.find((entry) => entry.id === id);
  if (existing === undefined) {
    return state;
  }
  const patched = patchEntry(existing, patch);
  if (patched === null) {
    return state;
  }
  return {
    ...state,
    entries: withEntry(state.entries, patched),
    rollback: remembering(state, id, [existing]),
  };
}

export function applyLocalRemove(
  state: RoomContents,
  id: string,
): RoomContents {
  const removed = threadOf(state.entries, id);
  if (removed.length === 0) {
    return state;
  }
  return {
    ...state,
    entries: state.entries.filter((entry) => !removed.includes(entry)),
    rollback: remembering(state, id, removed),
  };
}

function rolledBack(state: RoomContents, id: string): RoomContents["entries"] {
  const held = state.rollback[id];
  if (held === undefined) {
    return state.entries;
  }
  const survivors = state.entries.filter(
    (entry) => !held.some((restored) => restored.id === entry.id),
  );
  return [...survivors, ...held].sort(byCreatedAt);
}

export function applyRoomMessage(
  state: RoomContents,
  message: RoomToClientMessage,
): RoomContents {
  switch (message.type) {
    case "snapshot":
      return {
        entries: [...message.overlay.entries].sort(byCreatedAt),
        readers: message.readers,
        canWrite: message.canWrite,
        canEdit: message.canEdit,
        rejection: null,
        loaded: true,
        rollback: {},
        pending: [],
        landed: false,
        failed: false,
      };
    case "entry-added":
    case "entry-patched":
      return {
        ...state,
        entries: withEntry(state.entries, message.entry),
        rollback: without(state.rollback, message.entry.id),
        ...settled(state, message.entry.id, { landed: true }),
      };
    case "entry-removed":
      return {
        ...state,
        entries: state.entries.filter(
          (entry) => entry.id !== message.id && entry.parentId !== message.id,
        ),
        rollback: without(state.rollback, message.id),
        ...settled(state, message.id, { landed: true }),
      };
    case "presence":
      return { ...state, readers: message.readers };
    case "rejected":
      if (message.id === null) {
        return { ...state, rejection: message.reason, failed: true };
      }
      return {
        ...state,
        rejection: message.reason,
        entries: rolledBack(state, message.id),
        rollback: without(state.rollback, message.id),
        ...settled(state, message.id, { landed: false }),
      };
  }
}
