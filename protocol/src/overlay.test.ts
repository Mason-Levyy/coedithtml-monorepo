import { describe, expect, it } from "vitest";
import { anchorFromText, type Anchor } from "./anchor";
import { emptyOverlay, unresolvedCount, type OverlayEntry } from "./overlay";
import {
  parseAnchor,
  parseOverlayDocument,
  parseOverlayEntry,
} from "./parse-overlay";

const TEXT = "Revenue grew 18% year over year.";

function anchor(): Anchor {
  const built = anchorFromText({
    text: TEXT,
    start: 0,
    end: "Revenue grew 18%".length,
    path: "body/p[1]",
    revision: "rev-1",
  });
  if (built === null) {
    throw new Error("could not build the anchor");
  }
  return built;
}

function entry(overrides: Partial<OverlayEntry> = {}): OverlayEntry {
  return {
    id: "entry-1",
    parentId: null,
    anchor: anchor(),
    kind: "comment",
    body: "Is this net or gross?",
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    status: "open",
    createdAt: "2026-08-04T00:00:00.000Z",
    ...overrides,
  };
}

describe("emptyOverlay", () => {
  it("starts versioned and pinned to a revision", () => {
    expect(emptyOverlay("rev-1")).toEqual({
      version: 1,
      artifactRevision: "rev-1",
      entries: [],
    });
  });
});

describe("unresolvedCount", () => {
  it("counts open comments, not replies and not resolved threads", () => {
    const overlay = {
      ...emptyOverlay("rev-1"),
      entries: [
        entry({ id: "a" }),
        entry({ id: "b", status: "resolved" }),
        entry({ id: "c", kind: "reply", parentId: "a" }),
        entry({ id: "d" }),
      ],
    };

    expect(unresolvedCount(overlay)).toBe(2);
  });
});

describe("parseOverlayEntry", () => {
  it("round-trips a well-formed entry", () => {
    const original = entry();

    expect(parseOverlayEntry(JSON.parse(JSON.stringify(original)))).toEqual(
      original,
    );
  });

  it("rejects an unknown kind or status", () => {
    expect(parseOverlayEntry({ ...entry(), kind: "edit" })).toBeNull();
    expect(parseOverlayEntry({ ...entry(), status: "archived" })).toBeNull();
  });

  it("rejects an author that does not declare a source", () => {
    expect(
      parseOverlayEntry({
        ...entry(),
        author: { id: "reader-1", displayName: "Sam" },
      }),
    ).toBeNull();
  });

  // Falling back to null here would quietly promote a reply to a comment.
  it("rejects a malformed parentId rather than treating it as absent", () => {
    expect(parseOverlayEntry({ ...entry(), parentId: "" })).toBeNull();
    expect(parseOverlayEntry({ ...entry(), parentId: 7 })).toBeNull();
  });

  it("accepts an absent parentId as a top-level comment", () => {
    const withoutParent: Record<string, unknown> = { ...entry() };
    delete withoutParent.parentId;

    expect(parseOverlayEntry(withoutParent)?.parentId).toBeNull();
  });
});

describe("parseAnchor", () => {
  it("rejects an anchor with no quote to look for", () => {
    expect(parseAnchor({ ...anchor(), quote: "" })).toBeNull();
  });

  it("rejects an anchor that names no revision", () => {
    expect(parseAnchor({ ...anchor(), revision: "" })).toBeNull();
  });

  it("keeps empty context, which is valid at the edges of a document", () => {
    expect(parseAnchor({ ...anchor(), prefix: "", suffix: "" })).not.toBeNull();
  });
});

describe("parseOverlayDocument", () => {
  it("round-trips a document with entries", () => {
    const overlay = { ...emptyOverlay("rev-1"), entries: [entry()] };

    expect(parseOverlayDocument(JSON.parse(JSON.stringify(overlay)))).toEqual(
      overlay,
    );
  });

  it("rejects a version it does not understand", () => {
    expect(parseOverlayDocument({ ...emptyOverlay("rev-1"), version: 2 })).toBe(
      null,
    );
  });

  // Dropping the bad one would silently lose somebody's comment.
  it("fails the whole document when one entry is malformed", () => {
    const overlay = {
      ...emptyOverlay("rev-1"),
      entries: [entry({ id: "a" }), { ...entry({ id: "b" }), status: "nope" }],
    };

    expect(parseOverlayDocument(overlay)).toBeNull();
  });
});
