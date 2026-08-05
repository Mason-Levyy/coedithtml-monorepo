import type {
  OverlayEntry,
  ReaderPresence,
  RejectionReason,
  RoomToClientMessage,
} from "@/lib/protocol";

export type RoomContents = {
  entries: OverlayEntry[];
  readers: ReaderPresence[];
  canWrite: boolean;
  rejection: RejectionReason | null;
  loaded: boolean;
};

export const EMPTY_ROOM: RoomContents = {
  entries: [],
  readers: [],
  canWrite: false,
  rejection: null,
  loaded: false,
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
      };
    case "entry-added":
    case "entry-patched":
      return { ...state, entries: withEntry(state.entries, message.entry) };
    case "entry-removed":
      return {
        ...state,
        entries: state.entries.filter(
          (entry) => entry.id !== message.id && entry.parentId !== message.id,
        ),
      };
    case "presence":
      return { ...state, readers: message.readers };
    case "rejected":
      return { ...state, rejection: message.reason };
  }
}
