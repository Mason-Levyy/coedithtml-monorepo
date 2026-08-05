import { describe, expect, it } from "vitest";
import {
  addEntryMessage,
  patchEntryMessage,
  removeEntryMessage,
  type Anchor,
  type CommentEntry,
  type OverlayEntry,
  type ReplyEntry,
  type StickyEntry,
} from "@coedithtml/protocol";
import { memoryEntryStore } from "./fakes";
import {
  MAX_BODY_LENGTH,
  MAX_ENTRIES_PER_ROOM,
  applyClientMessage,
  type EntryStore,
} from "./overlay-log";

const NOW = "2026-08-04T12:00:00.000Z";
const EARLIER = "2020-01-01T00:00:00.000Z";

const ANCHOR: Anchor = {
  kind: "text",
  quote: "Revenue grew",
  prefix: "",
  suffix: " 18% this quarter.",
  path: "p[1]",
  revision: "r1",
};

function comment(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    kind: "comment",
    id: "c1",
    parentId: null,
    anchor: ANCHOR,
    body: "Is this net or gross?",
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    status: "open",
    createdAt: EARLIER,
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

function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
  return {
    ...comment(),
    kind: "sticky",
    id: "s1",
    offsetX: 12,
    offsetY: 24,
    tail: null,
    ...overrides,
  };
}

function apply(
  store: EntryStore,
  message: Parameters<typeof applyClientMessage>[1],
) {
  return applyClientMessage(store, message, NOW);
}

describe("applyClientMessage", () => {
  it("stores a new comment and broadcasts it", () => {
    const store = memoryEntryStore();
    const outcome = apply(store, addEntryMessage(comment()));

    expect(outcome).toMatchObject({ ok: true });
    expect(store.list()).toHaveLength(1);
  });

  // Client clocks lie, and the rail orders threads by this field.
  it("stamps the server's time over whatever the client claimed", () => {
    const store = memoryEntryStore();
    apply(store, addEntryMessage(comment({ createdAt: "not-a-time" })));

    expect(store.get("c1")?.createdAt).toBe(NOW);
  });

  it("treats a resent entry as the one already stored", () => {
    const store = memoryEntryStore([comment({ body: "the first wording" })]);
    const outcome = apply(
      store,
      addEntryMessage(comment({ body: "a retype" })),
    );

    expect(outcome).toMatchObject({ ok: true });
    expect(store.get("c1")?.body).toBe("the first wording");
    expect(store.count()).toBe(1);
  });

  it("refuses a reply whose parent is not in the room", () => {
    const store = memoryEntryStore();
    const outcome = apply(store, addEntryMessage(reply()));

    expect(outcome).toMatchObject({ ok: false, reason: "unknown-entry" });
    expect(store.count()).toBe(0);
  });

  it("accepts a reply once its parent exists", () => {
    const store = memoryEntryStore([comment()]);
    const outcome = apply(store, addEntryMessage(reply()));

    expect(outcome).toMatchObject({ ok: true });
    expect(store.count()).toBe(2);
  });

  it("refuses a body past the length cap", () => {
    const store = memoryEntryStore();
    const outcome = apply(
      store,
      addEntryMessage(comment({ body: "x".repeat(MAX_BODY_LENGTH + 1) })),
    );

    expect(outcome).toMatchObject({ ok: false, reason: "too-long" });
  });

  it("refuses to grow a room past its entry cap", () => {
    const filled: OverlayEntry[] = Array.from(
      { length: MAX_ENTRIES_PER_ROOM },
      (_, at) => comment({ id: `c${at}` }),
    );
    const outcome = apply(
      memoryEntryStore(filled),
      addEntryMessage(comment({ id: "one-too-many" })),
    );

    expect(outcome).toMatchObject({ ok: false, reason: "limit-reached" });
  });

  it("leaves fields the patch does not name alone", () => {
    const store = memoryEntryStore([comment()]);
    apply(store, patchEntryMessage("c1", { status: "resolved" }));

    expect(store.get("c1")).toMatchObject({
      status: "resolved",
      body: "Is this net or gross?",
      color: "yellow",
    });
  });

  it("retracts a tail when the patch names it as null", () => {
    const store = memoryEntryStore([sticky({ tail: ANCHOR })]);
    apply(store, patchEntryMessage("s1", { tail: null }));

    expect(store.get("s1")).toMatchObject({ tail: null });
  });

  // offsetX on a comment would be a field the rail can never show or move.
  it("refuses to move something that does not float", () => {
    const store = memoryEntryStore([comment()]);
    const outcome = apply(store, patchEntryMessage("c1", { offsetX: 40 }));

    expect(outcome).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("refuses to patch an entry that is not there", () => {
    const outcome = apply(
      memoryEntryStore(),
      patchEntryMessage("ghost", { status: "resolved" }),
    );

    expect(outcome).toMatchObject({ ok: false, reason: "unknown-entry" });
  });

  // A reply outliving its parent is an orphan no thread can render.
  it("takes a thread's replies with it when the parent is removed", () => {
    const store = memoryEntryStore([
      comment(),
      reply({ id: "r1" }),
      reply({ id: "r2" }),
      comment({ id: "c2" }),
    ]);
    apply(store, removeEntryMessage("c1"));

    expect(store.list().map((entry) => entry.id)).toEqual(["c2"]);
  });

  it("refuses to remove an entry that is not there", () => {
    const outcome = apply(memoryEntryStore(), removeEntryMessage("ghost"));

    expect(outcome).toMatchObject({ ok: false, reason: "unknown-entry" });
  });

  it("has nothing to broadcast for a hello", () => {
    const store = memoryEntryStore();
    const outcome = applyClientMessage(
      store,
      { version: 1, type: "hello", reader: { id: "r", displayName: "Sam" } },
      NOW,
    );

    expect(outcome).toBeNull();
  });
});
