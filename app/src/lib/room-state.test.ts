import { describe, expect, it } from "vitest";
import type {
  CommentEntry,
  OverlayEntry,
  RejectionReason,
  ReplyEntry,
  StickyEntry,
} from "@/lib/protocol";
import {
  EMPTY_ROOM,
  applyLocalPatch,
  applyLocalRemove,
  applyRoomMessage,
  saveStateOf,
  writeSent,
  writesAbandoned,
} from "@/lib/room-state";

const ANCHOR = {
  kind: "text" as const,
  quote: "Revenue grew",
  prefix: "",
  suffix: "",
  path: "p[1]",
  revision: "r1",
};

function comment(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    kind: "comment",
    id: "c1",
    parentId: null,
    anchor: ANCHOR,
    body: "Net or gross?",
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
    ...overrides,
  };
}

function reply(overrides: Partial<ReplyEntry> = {}): ReplyEntry {
  return {
    ...comment(),
    kind: "reply",
    id: "r1",
    parentId: "c1",
    ...overrides,
  };
}

function snapshot(entries: OverlayEntry[], canWrite = true, canEdit = false) {
  return {
    version: 1 as const,
    type: "snapshot" as const,
    overlay: { version: 1 as const, artifactRevision: "r1", entries },
    readers: [],
    canWrite,
    canEdit,
  };
}

function idsOf(entries: OverlayEntry[]): string[] {
  return entries.map((entry) => entry.id);
}

function rejection(reason: RejectionReason, id: string | null) {
  return { version: 1 as const, type: "rejected" as const, reason, id };
}

function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
  return {
    ...comment(),
    kind: "sticky",
    id: "s1",
    parentId: null,
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    tail: null,
    ...overrides,
  };
}

describe("changes made locally while the room catches up", () => {
  function loadedWith(entries: OverlayEntry[]) {
    return applyRoomMessage(EMPTY_ROOM, snapshot(entries));
  }

  it("moves a sticky the moment the reader lets go", () => {
    const state = applyLocalPatch(loadedWith([sticky()]), "s1", {
      offsetX: 120,
      offsetY: 40,
    });

    expect(state.entries[0]).toMatchObject({ offsetX: 120, offsetY: 40 });
  });

  it("puts the sticky back where it was when the room refuses", () => {
    const moved = applyLocalPatch(loadedWith([sticky()]), "s1", {
      offsetX: 120,
    });
    const state = applyRoomMessage(moved, rejection("read-only", "s1"));

    expect(state.entries[0]).toMatchObject({ offsetX: 0 });
    expect(state.rejection).toBe("read-only");
  });

  it("undoes to where the drag started, not to where it paused", () => {
    const first = applyLocalPatch(loadedWith([sticky()]), "s1", {
      offsetX: 120,
    });
    const second = applyLocalPatch(first, "s1", { offsetX: 300 });
    const state = applyRoomMessage(second, rejection("read-only", "s1"));

    expect(state.entries[0]).toMatchObject({ offsetX: 0 });
  });

  it("forgets the undo once the room confirms the move", () => {
    const moved = applyLocalPatch(loadedWith([sticky()]), "s1", {
      offsetX: 120,
    });
    const confirmed = applyRoomMessage(moved, {
      version: 1,
      type: "entry-patched",
      entry: sticky({ offsetX: 120 }),
    });
    const state = applyRoomMessage(confirmed, rejection("malformed", "s1"));

    expect(state.entries[0]).toMatchObject({ offsetX: 120 });
  });

  it("restores a deleted thread and its replies together", () => {
    const removed = applyLocalRemove(loadedWith([comment(), reply()]), "c1");
    const state = applyRoomMessage(removed, rejection("read-only", "c1"));

    expect(idsOf(removed.entries)).toEqual([]);
    expect(idsOf(state.entries).sort()).toEqual(["c1", "r1"]);
  });

  it("still reports a rejection that names no entry", () => {
    const moved = applyLocalPatch(loadedWith([sticky()]), "s1", {
      offsetX: 120,
    });
    const state = applyRoomMessage(moved, rejection("read-only", null));

    expect(state.rejection).toBe("read-only");
    expect(state.entries[0]).toMatchObject({ offsetX: 120 });
  });

  it("ignores a local change to an entry the room never had", () => {
    const loaded = loadedWith([sticky()]);

    expect(applyLocalPatch(loaded, "gone", { offsetX: 1 })).toBe(loaded);
    expect(applyLocalRemove(loaded, "gone")).toBe(loaded);
  });
});

describe("applyRoomMessage", () => {
  it("orders a snapshot oldest first", () => {
    const state = applyRoomMessage(
      EMPTY_ROOM,
      snapshot([
        comment({ id: "late", createdAt: "2026-08-04T13:00:00.000Z" }),
        comment({ id: "early", createdAt: "2026-08-04T11:00:00.000Z" }),
      ]),
    );

    expect(idsOf(state.entries)).toEqual(["early", "late"]);
  });

  it("records whether this link may write", () => {
    const state = applyRoomMessage(EMPTY_ROOM, snapshot([], false));

    expect(state).toMatchObject({ canWrite: false, loaded: true });
  });

  it("separates writing from editing, so a suggest link gets no caret", () => {
    const suggesting = applyRoomMessage(EMPTY_ROOM, snapshot([], true, false));
    const editing = applyRoomMessage(EMPTY_ROOM, snapshot([], true, true));

    expect(suggesting).toMatchObject({ canWrite: true, canEdit: false });
    expect(editing).toMatchObject({ canWrite: true, canEdit: true });
  });

  it("keeps the room in order as entries arrive", () => {
    const loaded = applyRoomMessage(
      EMPTY_ROOM,
      snapshot([
        comment({ id: "late", createdAt: "2026-08-04T13:00:00.000Z" }),
      ]),
    );
    const state = applyRoomMessage(loaded, {
      version: 1,
      type: "entry-added",
      entry: comment({ id: "early", createdAt: "2026-08-04T11:00:00.000Z" }),
    });

    expect(idsOf(state.entries)).toEqual(["early", "late"]);
  });

  it("replaces rather than duplicates an entry it already holds", () => {
    const loaded = applyRoomMessage(EMPTY_ROOM, snapshot([comment()]));
    const state = applyRoomMessage(loaded, {
      version: 1,
      type: "entry-patched",
      entry: comment({ status: "resolved" }),
    });

    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({ status: "resolved" });
  });

  it("drops a thread's replies with the thread", () => {
    const loaded = applyRoomMessage(
      EMPTY_ROOM,
      snapshot([comment(), reply(), comment({ id: "c2" })]),
    );
    const state = applyRoomMessage(loaded, {
      version: 1,
      type: "entry-removed",
      id: "c1",
    });

    expect(idsOf(state.entries)).toEqual(["c2"]);
  });

  it("clears a stale rejection when a fresh snapshot arrives", () => {
    const rejected = applyRoomMessage(EMPTY_ROOM, {
      version: 1,
      type: "rejected",
      reason: "read-only",
      id: null,
    });
    const state = applyRoomMessage(rejected, snapshot([]));

    expect(rejected.rejection).toBe("read-only");
    expect(state.rejection).toBeNull();
  });

  it("keeps the entries when only presence changes", () => {
    const loaded = applyRoomMessage(EMPTY_ROOM, snapshot([comment()]));
    const state = applyRoomMessage(loaded, {
      version: 1,
      type: "presence",
      readers: [{ id: "reader-2", displayName: "Alex" }],
    });

    expect(state.entries).toHaveLength(1);
    expect(state.readers).toHaveLength(1);
  });
});

describe("what the reader is told about their own writes", () => {
  function opened() {
    return applyRoomMessage(EMPTY_ROOM, snapshot([]));
  }

  it("says nothing until the reader has written something", () => {
    expect(saveStateOf(opened())).toBe("idle");
  });

  it("is saving from the moment a write goes out", () => {
    expect(saveStateOf(writeSent(opened(), "c1"))).toBe("saving");
  });

  it("is saved only once the room echoes the write back", () => {
    const state = applyRoomMessage(writeSent(opened(), "c1"), {
      version: 1,
      type: "entry-added",
      entry: comment(),
    });

    expect(saveStateOf(state)).toBe("saved");
  });

  it("keeps saying saving while any write is still out", () => {
    const sent = writeSent(writeSent(opened(), "c1"), "c2");
    const state = applyRoomMessage(sent, {
      version: 1,
      type: "entry-added",
      entry: comment(),
    });

    expect(saveStateOf(state)).toBe("saving");
  });

  it("says a rejected write failed rather than pretending it landed", () => {
    const state = applyRoomMessage(writeSent(opened(), "c1"), {
      version: 1,
      type: "rejected",
      reason: "stale",
      id: "c1",
    });

    expect(saveStateOf(state)).toBe("failed");
  });

  it("counts a socket that went away with writes out as a failure", () => {
    expect(saveStateOf(writesAbandoned(writeSent(opened(), "c1")))).toBe(
      "failed",
    );
  });

  it("leaves a settled room alone when the socket closes", () => {
    const settled = opened();

    expect(writesAbandoned(settled)).toBe(settled);
  });

  it("clears the failure when the reader tries again", () => {
    const failed = writesAbandoned(writeSent(opened(), "c1"));

    expect(saveStateOf(writeSent(failed, "c1"))).toBe("saving");
  });

  it("forgets what a previous connection was doing on a fresh snapshot", () => {
    const failed = writesAbandoned(writeSent(opened(), "c1"));

    expect(saveStateOf(applyRoomMessage(failed, snapshot([])))).toBe("idle");
  });
});
