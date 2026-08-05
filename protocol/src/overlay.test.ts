import { describe, expect, it } from "vitest";
import { anchorFromText, regionAnchor, type Anchor } from "./anchor";
import {
  emptyOverlay,
  hasTail,
  repliesTo,
  tailIsRetracted,
  unresolvedCount,
  type Author,
  type CommentEntry,
  type OverlayEntry,
  type ReplyEntry,
  type StickyEntry,
} from "./overlay";
import { parseAnchor } from "./parse-anchor";
import { parseOverlayDocument, parseOverlayEntry } from "./parse-overlay";

const TEXT = "Revenue grew 18% year over year.";
const WHEN = "2026-08-04T00:00:00.000Z";
const AUTHOR: Author = {
  id: "reader-1",
  displayName: "Sam",
  source: "anonymous",
};

function textAnchor(): Anchor {
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

function chartAnchor(): Anchor {
  const built = regionAnchor({
    path: "body/figure[1]/img[1]",
    fractionX: 0.6,
    fractionY: 0.35,
    revision: "rev-1",
  });
  if (built === null) {
    throw new Error("could not build the region anchor");
  }
  return built;
}

function comment(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    id: "entry-1",
    parentId: null,
    anchor: textAnchor(),
    kind: "comment",
    body: "Is this net or gross?",
    author: AUTHOR,
    color: "yellow",
    status: "open",
    createdAt: WHEN,
    ...overrides,
  };
}

function reply(overrides: Partial<ReplyEntry> = {}): ReplyEntry {
  return { ...comment(), kind: "reply", parentId: "entry-1", ...overrides };
}

function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
  return {
    ...comment(),
    kind: "sticky",
    body: "Swap this chart for the cohort view",
    color: "pink",
    offsetX: 24,
    offsetY: -12,
    tail: null,
    ...overrides,
  };
}

function roundTrip(entry: OverlayEntry): OverlayEntry | null {
  return parseOverlayEntry(JSON.parse(JSON.stringify(entry)));
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
  it("counts open marks of every kind, but never a reply", () => {
    const overlay = {
      ...emptyOverlay("rev-1"),
      entries: [
        comment({ id: "a" }),
        comment({ id: "b", status: "resolved" }),
        reply({ id: "c", parentId: "a" }),
        sticky({ id: "d" }),
      ],
    };

    expect(unresolvedCount(overlay)).toBe(2);
  });
});

describe("repliesTo", () => {
  it("gathers only the replies of the thread it was asked about", () => {
    const overlay = {
      ...emptyOverlay("rev-1"),
      entries: [
        comment({ id: "a" }),
        reply({ id: "b", parentId: "a" }),
        reply({ id: "c", parentId: "z" }),
      ],
    };

    expect(repliesTo(overlay, "a").map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("a callout is a sticky whose tail is set", () => {
  it("draws no pointer until a tail is given", () => {
    expect(hasTail(sticky())).toBe(false);
    expect(hasTail(sticky({ tail: chartAnchor() }))).toBe(true);
  });

  it("points at a chart that carries no text of its own", () => {
    const callout = sticky({ tail: chartAnchor() });

    expect(roundTrip(callout)).toEqual(callout);
  });

  it("retracts the tail when its tip is dropped back inside the box", () => {
    const box = { x: 100, y: 100, width: 200, height: 80 };

    expect(tailIsRetracted(box, { x: 150, y: 140 })).toBe(true);
    expect(tailIsRetracted(box, { x: 100, y: 100 })).toBe(true);
    expect(tailIsRetracted(box, { x: 340, y: 140 })).toBe(false);
    expect(tailIsRetracted(box, { x: 150, y: 400 })).toBe(false);
  });
});

describe("parseOverlayEntry", () => {
  it("round-trips a comment, a reply and a sticky", () => {
    expect(roundTrip(comment())).toEqual(comment());
    expect(roundTrip(reply())).toEqual(reply());
    expect(roundTrip(sticky())).toEqual(sticky());
  });

  it("rejects an unknown kind, status or colour", () => {
    expect(parseOverlayEntry({ ...comment(), kind: "edit" })).toBeNull();
    expect(parseOverlayEntry({ ...comment(), status: "archived" })).toBeNull();
    expect(parseOverlayEntry({ ...comment(), color: "chartreuse" })).toBeNull();
  });

  it("rejects an author that does not declare a source", () => {
    expect(
      parseOverlayEntry({
        ...comment(),
        author: { id: "reader-1", displayName: "Sam" },
      }),
    ).toBeNull();
  });

  it("rejects a reply that names no parent", () => {
    expect(parseOverlayEntry({ ...reply(), parentId: null })).toBeNull();
    expect(parseOverlayEntry({ ...reply(), parentId: "" })).toBeNull();
    expect(parseOverlayEntry({ ...reply(), parentId: 7 })).toBeNull();
  });

  // Accepting it would silently demote a reply to a top-level comment.
  it("rejects a comment that claims a parent", () => {
    expect(parseOverlayEntry({ ...comment(), parentId: "entry-9" })).toBeNull();
  });

  it("accepts an absent parentId on a comment", () => {
    const withoutParent: Record<string, unknown> = { ...comment() };
    delete withoutParent.parentId;

    expect(parseOverlayEntry(withoutParent)?.parentId).toBeNull();
  });

  it("rejects a sticky whose offset is not a usable number", () => {
    expect(parseOverlayEntry({ ...sticky(), offsetX: "24" })).toBeNull();
    expect(parseOverlayEntry({ ...sticky(), offsetY: Number.NaN })).toBeNull();
  });

  it("rejects a sticky with no offset at all", () => {
    const withoutOffset: Record<string, unknown> = { ...sticky() };
    delete withoutOffset.offsetX;

    expect(parseOverlayEntry(withoutOffset)).toBeNull();
  });

  it("rejects a malformed tail rather than dropping the pointer", () => {
    expect(
      parseOverlayEntry({ ...sticky(), tail: { kind: "region", path: "x" } }),
    ).toBeNull();
  });

  it("accepts an absent tail as a plain sticky", () => {
    const withoutTail: Record<string, unknown> = { ...sticky() };
    delete withoutTail.tail;

    expect(parseOverlayEntry(withoutTail)).toEqual(sticky());
  });
});

describe("parseAnchor", () => {
  it("rejects an anchor that declares no kind", () => {
    const untyped: Record<string, unknown> = { ...textAnchor() };
    delete untyped.kind;

    expect(parseAnchor(untyped)).toBeNull();
  });

  it("rejects a text anchor with no quote to look for", () => {
    expect(parseAnchor({ ...textAnchor(), quote: "" })).toBeNull();
  });

  it("rejects an anchor that names no revision", () => {
    expect(parseAnchor({ ...textAnchor(), revision: "" })).toBeNull();
    expect(parseAnchor({ ...chartAnchor(), revision: "" })).toBeNull();
  });

  it("keeps empty context, which is valid at the edges of a document", () => {
    expect(
      parseAnchor({ ...textAnchor(), prefix: "", suffix: "" }),
    ).not.toBeNull();
  });

  it("rejects a region point outside its element", () => {
    expect(parseAnchor({ ...chartAnchor(), fractionX: 1.2 })).toBeNull();
  });
});

describe("parseOverlayDocument", () => {
  it("round-trips a document holding every kind of mark", () => {
    const overlay = {
      ...emptyOverlay("rev-1"),
      entries: [
        comment({ id: "a" }),
        reply({ id: "b", parentId: "a" }),
        sticky({ id: "c", tail: chartAnchor() }),
      ],
    };

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
      entries: [
        comment({ id: "a" }),
        { ...comment({ id: "b" }), status: "no" },
      ],
    };

    expect(parseOverlayDocument(overlay)).toBeNull();
  });
});
