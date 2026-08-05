import { describe, expect, it } from "vitest";
import type { Anchor } from "./anchor";
import { patchEntry, type CommentEntry, type StickyEntry } from "./overlay";
import {
  parseClientToRoomMessage,
  parseRoomToClientMessage,
} from "./parse-room";
import {
  addEntryMessage,
  helloMessage,
  patchEntryMessage,
  presenceMessage,
  rejectedMessage,
  removeEntryMessage,
  snapshotMessage,
} from "./room";

const ANCHOR: Anchor = {
  kind: "text",
  quote: "Revenue grew",
  prefix: "",
  suffix: " sharply",
  path: "p[1]",
  revision: "r1",
};

const COMMENT: CommentEntry = {
  kind: "comment",
  id: "c1",
  parentId: null,
  anchor: ANCHOR,
  body: "Net or gross?",
  author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
  color: "yellow",
  status: "open",
  createdAt: "2026-08-04T12:00:00.000Z",
};

const STICKY: StickyEntry = {
  ...COMMENT,
  kind: "sticky",
  id: "s1",
  offsetX: 10,
  offsetY: 20,
  tail: ANCHOR,
};

function roundTrip<T>(message: T): unknown {
  return JSON.parse(JSON.stringify(message));
}

describe("parseClientToRoomMessage", () => {
  it("reads every message the app can send", () => {
    const sent = [
      helloMessage({ id: "reader-1", displayName: "Sam" }),
      addEntryMessage(COMMENT),
      patchEntryMessage("c1", { status: "resolved" }),
      removeEntryMessage("c1"),
    ];

    for (const message of sent) {
      expect(parseClientToRoomMessage(roundTrip(message))).toEqual(message);
    }
  });

  it("rejects a message from a protocol it does not speak", () => {
    const message = { ...removeEntryMessage("c1"), version: 99 };

    expect(parseClientToRoomMessage(message)).toBeNull();
  });

  it("rejects a type it has never heard of", () => {
    expect(
      parseClientToRoomMessage({ version: 1, type: "drop-table" }),
    ).toBeNull();
  });

  it("rejects an entry that is not a whole entry", () => {
    const incomplete: Record<string, unknown> = { ...COMMENT };
    delete incomplete.body;

    expect(
      parseClientToRoomMessage({
        version: 1,
        type: "add-entry",
        entry: incomplete,
      }),
    ).toBeNull();
  });

  // An absent field and a null one mean different things to a tail.
  it("keeps a patch's absent fields absent", () => {
    const parsed = parseClientToRoomMessage(
      roundTrip(patchEntryMessage("s1", { color: "pink" })),
    );

    expect(parsed).toMatchObject({ patch: { color: "pink" } });
    expect(parsed && "tail" in (parsed as { patch: object }).patch).toBe(false);
  });

  it("reads a null tail as the instruction to retract it", () => {
    const parsed = parseClientToRoomMessage({
      version: 1,
      type: "patch-entry",
      id: "s1",
      patch: { tail: null },
    });

    expect(parsed).toMatchObject({ patch: { tail: null } });
  });

  it("rejects a patch whose field is the wrong shape", () => {
    expect(
      parseClientToRoomMessage({
        version: 1,
        type: "patch-entry",
        id: "s1",
        patch: { color: "chartreuse" },
      }),
    ).toBeNull();
  });
});

describe("parseRoomToClientMessage", () => {
  it("reads every message the room can send", () => {
    const sent = [
      snapshotMessage({
        overlay: { version: 1, artifactRevision: "r1", entries: [COMMENT] },
        readers: [{ id: "reader-1", displayName: "Sam" }],
        canWrite: true,
      }),
      presenceMessage([{ id: "reader-1", displayName: "Sam" }]),
      rejectedMessage("read-only"),
    ];

    for (const message of sent) {
      expect(parseRoomToClientMessage(roundTrip(message))).toEqual(message);
    }
  });

  it("rejects a rejection reason it cannot show anyone", () => {
    expect(
      parseRoomToClientMessage({ version: 1, type: "rejected", reason: "🤷" }),
    ).toBeNull();
  });

  it("rejects a snapshot that does not say whether writing is allowed", () => {
    expect(
      parseRoomToClientMessage({
        version: 1,
        type: "snapshot",
        overlay: { version: 1, artifactRevision: "r1", entries: [] },
        readers: [],
      }),
    ).toBeNull();
  });
});

describe("patchEntry", () => {
  it("changes only what the patch names", () => {
    expect(patchEntry(COMMENT, { body: "Rephrased" })).toEqual({
      ...COMMENT,
      body: "Rephrased",
    });
  });

  it("retracts a tail without touching the position", () => {
    expect(patchEntry(STICKY, { tail: null })).toEqual({
      ...STICKY,
      tail: null,
    });
  });

  it("moves a sticky", () => {
    expect(patchEntry(STICKY, { offsetX: 99 })).toMatchObject({
      offsetX: 99,
      offsetY: 20,
    });
  });

  // A comment is placed by its anchor, so an offset on one has nowhere to go.
  it("refuses to move something that does not float", () => {
    expect(patchEntry(COMMENT, { offsetY: 5 })).toBeNull();
    expect(patchEntry(COMMENT, { tail: ANCHOR })).toBeNull();
  });
});
