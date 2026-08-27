import { describe, expect, it } from "vitest";
import type {
  CommentEntry,
  EditEntry,
  OverlayEntry,
  ReplyEntry,
  StickyEntry,
} from "@/lib/protocol";
import { stepForAdd, stepForPatch, stepForRemove } from "@/lib/undo-stack";

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

function reply(): ReplyEntry {
  return { ...comment(), kind: "reply", id: "r1", parentId: "c1" };
}

function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
  return {
    ...comment(),
    kind: "sticky",
    id: "s1",
    parentId: null,
    offsetX: 10,
    offsetY: 20,
    width: 200,
    height: 100,
    tail: null,
    textSize: "m",
    ...overrides,
  };
}

function edit(): EditEntry {
  return { ...comment(), kind: "edit", id: "e1", parentId: null, rev: 3 };
}

describe("undoing what the reader just did", () => {
  it("takes back an entry it watched go out", () => {
    const step = stepForAdd(comment());

    expect(step.undo).toEqual([{ kind: "remove", id: "c1" }]);
    expect(step.touchesText).toBe(false);
  });

  it("brings back a whole thread, replies and all", () => {
    const entries: OverlayEntry[] = [comment(), reply()];

    const step = stepForRemove(entries, "c1");

    expect(step?.undo.map((reversal) => reversal.kind)).toEqual(["add", "add"]);
    expect(step?.redo).toEqual([{ kind: "remove", id: "c1" }]);
  });

  it("has nothing to say about an entry that was never there", () => {
    expect(stepForRemove([], "c1")).toBeNull();
  });

  it("restores only the fields a patch actually touched", () => {
    const step = stepForPatch([sticky()], "s1", { offsetX: 400 });

    expect(step?.undo).toEqual([
      { kind: "patch", id: "s1", patch: { offsetX: 10 } },
    ]);
  });

  it("puts a resolved thread back to open", () => {
    const step = stepForPatch([comment()], "c1", { status: "resolved" });

    expect(step?.undo).toEqual([
      { kind: "patch", id: "c1", patch: { status: "open" } },
    ]);
  });

  it("drops ifRev, so a deliberate undo is never refused as stale", () => {
    const step = stepForPatch([edit()], "e1", {
      ifRev: 3,
      body: "Revenue fell",
    });

    expect(step?.undo[0]).toMatchObject({
      patch: { body: "Net or gross?" },
    });
    expect(step?.undo[0]).not.toHaveProperty("patch.ifRev");
  });

  it("says when a step will need the frame reloaded", () => {
    expect(stepForAdd(edit()).touchesText).toBe(true);
    expect(stepForRemove([edit()], "e1")?.touchesText).toBe(true);
    expect(stepForPatch([edit()], "e1", { body: "x" })?.touchesText).toBe(true);
    expect(stepForPatch([sticky()], "s1", { offsetX: 1 })?.touchesText).toBe(
      false,
    );
  });

  it("records nothing for a patch that changes no field it can restore", () => {
    expect(stepForPatch([edit()], "e1", { ifRev: 3 })).toBeNull();
  });
});
