import {
  patchEntry,
  type EntryPatch,
  type OverlayEntry,
  type ReaderPresence,
  type RejectionReason,
  type RoomToClientMessage,
} from "@/lib/protocol";

export type RoomContents = {
  entries: OverlayEntry[];
  readers: ReaderPresence[];
  canWrite: boolean;
  rejection: RejectionReason | null;
  loaded: boolean;
  // What each in-flight change replaced, so a rejection can put it back.
  undo: Record<string, OverlayEntry[]>;
};

export const EMPTY_ROOM: RoomContents = {
  entries: [],
  readers: [],
  canWrite: false,
  rejection: null,
  loaded: false,
  undo: {},
};

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

function without(undo: RoomContents["undo"], id: string): RoomContents["undo"] {
  return Object.fromEntries(
    Object.entries(undo).filter(([held]) => held !== id),
  );
}

function threadOf(entries: OverlayEntry[], id: string): OverlayEntry[] {
  return entries.filter((entry) => entry.id === id || entry.parentId === id);
}

// Keeps the first snapshot: a second drag must not overwrite what to undo to.
function remembering(
  state: RoomContents,
  id: string,
  replaced: OverlayEntry[],
): RoomContents["undo"] {
  return id in state.undo ? state.undo : { ...state.undo, [id]: replaced };
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
    undo: remembering(state, id, [existing]),
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
    undo: remembering(state, id, removed),
  };
}

function rolledBack(state: RoomContents, id: string): RoomContents["entries"] {
  const held = state.undo[id];
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
        rejection: null,
        loaded: true,
        undo: {},
      };
    case "entry-added":
    case "entry-patched":
      return {
        ...state,
        entries: withEntry(state.entries, message.entry),
        undo: without(state.undo, message.entry.id),
      };
    case "entry-removed":
      return {
        ...state,
        entries: state.entries.filter(
          (entry) => entry.id !== message.id && entry.parentId !== message.id,
        ),
        undo: without(state.undo, message.id),
      };
    case "presence":
      return { ...state, readers: message.readers };
    case "rejected":
      if (message.id === null) {
        return { ...state, rejection: message.reason };
      }
      return {
        ...state,
        rejection: message.reason,
        entries: rolledBack(state, message.id),
        undo: without(state.undo, message.id),
      };
  }
}
