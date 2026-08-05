import { describe, expect, it } from "vitest";
import type { CommentEntry, OverlayEntry, ReplyEntry } from "@/lib/protocol";
import { EMPTY_ROOM, applyRoomMessage } from "@/lib/room-state";

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

function snapshot(entries: OverlayEntry[], canWrite = true) {
  return {
    version: 1 as const,
    type: "snapshot" as const,
    overlay: { version: 1 as const, artifactRevision: "r1", entries },
    readers: [],
    canWrite,
  };
}

function idsOf(entries: OverlayEntry[]): string[] {
  return entries.map((entry) => entry.id);
}

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

  // The same entry arrives twice when a client's own add is echoed back.
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
