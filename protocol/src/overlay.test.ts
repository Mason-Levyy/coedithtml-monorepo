import { describe, expect, it } from "vitest";
import { anchorFromText, regionAnchor, type Anchor } from "./anchor";
import {
  MAX_STICKY_HEIGHT,
  MAX_STICKY_WIDTH,
  MIN_STICKY_HEIGHT,
  MIN_STICKY_WIDTH,
  emptyOverlay,
  patchEntry,
  repliesTo,
  threadsIn,
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
    fill: null,
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
    width: null,
    height: null,
    tail: null,
    ...overrides,
  };
}

function roundTrip(entry: OverlayEntry): OverlayEntry | null {
  return parseOverlayEntry(JSON.parse(JSON.stringify(entry)));
}

describe("entries stored before fill and sizing existed", () => {
  function stripped(entry: OverlayEntry, ...fields: string[]): unknown {
    const record = JSON.parse(JSON.stringify(entry)) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).filter(([field]) => !fields.includes(field)),
    );
  }

  it("reads a comment that carries no fill", () => {
    expect(parseOverlayEntry(stripped(comment(), "fill"))).toMatchObject({
      fill: null,
    });
  });

  it("reads a sticky that carries no size", () => {
    const parsed = parseOverlayEntry(
      stripped(sticky(), "fill", "width", "height"),
    );

    expect(parsed).toMatchObject({ width: null, height: null });
  });

  it("reads a whole document of them", () => {
    const document = {
      version: 1,
      artifactRevision: "rev-1",
      entries: [
        stripped(comment(), "fill"),
        stripped(sticky(), "fill", "width", "height"),
      ],
    };

    expect(parseOverlayDocument(document)?.entries).toHaveLength(2);
  });

  it("still refuses a fill that is not a colour", () => {
    expect(parseOverlayEntry({ ...comment(), fill: "chartreuse" })).toBeNull();
    expect(parseOverlayEntry({ ...sticky(), width: "wide" })).toBeNull();
  });
});

describe("sticky sizing", () => {
  it("clamps a size the reader could drag past on the way in", () => {
    expect(
      parseOverlayEntry({ ...sticky(), width: 4, height: 9 }),
    ).toMatchObject({ width: MIN_STICKY_WIDTH, height: MIN_STICKY_HEIGHT });
    expect(
      parseOverlayEntry({ ...sticky(), width: 99999, height: 99999 }),
    ).toMatchObject({ width: MAX_STICKY_WIDTH, height: MAX_STICKY_HEIGHT });
  });

  it("clamps a resize the same way the runtime previewed it", () => {
    expect(patchEntry(sticky(), { width: 10_000 })).toMatchObject({
      width: MAX_STICKY_WIDTH,
    });
  });

  it("lets a size go back to sizing itself", () => {
    expect(patchEntry(sticky({ width: 300 }), { width: null })).toMatchObject({
      width: null,
    });
  });

  it("refuses to size anything that does not float", () => {
    expect(patchEntry(comment(), { width: 300 })).toBeNull();
    expect(patchEntry(comment(), { height: 300 })).toBeNull();
  });
});

describe("re-placing a mark", () => {
  it("moves a sticky onto the anchor the patch carries", () => {
    const moved = regionAnchor({
      path: "body/figure[2]",
      fractionX: 0.1,
      fractionY: 0.9,
      revision: "rev-2",
    });

    expect(
      patchEntry(sticky({ anchor: chartAnchor() }), {
        anchor: moved ?? undefined,
      })?.anchor,
    ).toEqual(moved);
  });

  it("leaves the rest of the sticky alone", () => {
    const patched = patchEntry(
      sticky({ anchor: chartAnchor(), offsetX: 24, body: "Swap it" }),
      { anchor: chartAnchor() },
    );

    expect(patched).toMatchObject({ offsetX: 24, body: "Swap it" });
  });

  it("refuses an anchor of a different kind than the mark it points with", () => {
    expect(patchEntry(comment(), { anchor: chartAnchor() })).toBeNull();
    expect(
      patchEntry(sticky({ anchor: chartAnchor() }), {
        anchor: textAnchor(),
      }),
    ).toBeNull();
  });

  it("keeps the original anchor when the patch carries none", () => {
    expect(patchEntry(comment(), { body: "Reworded" })?.anchor).toEqual(
      textAnchor(),
    );
  });
});

describe("fill", () => {
  it("recolours a mark without disturbing its named colour", () => {
    expect(patchEntry(comment(), { fill: "#0b1f4d" })).toMatchObject({
      color: "yellow",
      fill: "#0b1f4d",
    });
  });

  it("distinguishes clearing the fill from leaving it alone", () => {
    const filled = comment({ fill: "#0b1f4d" });

    expect(patchEntry(filled, { fill: null })).toMatchObject({ fill: null });
    expect(patchEntry(filled, { body: "Still blue" })).toMatchObject({
      fill: "#0b1f4d",
    });
  });
});

describe("emptyOverlay", () => {
  it("starts versioned and pinned to a revision", () => {
    expect(emptyOverlay("rev-1")).toEqual({
      version: 1,
      artifactRevision: "rev-1",
      entries: [],
    });
  });
});

describe("threadsIn", () => {
  it("keeps every kind that can start a thread, and no reply", () => {
    const entries = [
      comment({ id: "a" }),
      reply({ id: "b", parentId: "a" }),
      sticky({ id: "c" }),
    ];

    expect(threadsIn(entries).map((entry) => entry.id)).toEqual(["a", "c"]);
  });
});

describe("unresolvedCount", () => {
  it("counts open marks of every kind, but never a reply", () => {
    const entries = [
      comment({ id: "a" }),
      comment({ id: "b", status: "resolved" }),
      reply({ id: "c", parentId: "a" }),
      sticky({ id: "d" }),
    ];

    expect(unresolvedCount(entries)).toBe(2);
  });
});

describe("repliesTo", () => {
  it("gathers only the replies of the thread it was asked about", () => {
    const entries = [
      comment({ id: "a" }),
      reply({ id: "b", parentId: "a" }),
      reply({ id: "c", parentId: "z" }),
    ];

    expect(repliesTo(entries, "a").map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("a callout is a sticky whose tail is set", () => {
  it("draws no pointer until a tail is given", () => {
    expect(sticky().tail).toBeNull();
    expect(sticky({ tail: { x: 40, y: 120 } }).tail).not.toBeNull();
  });

  it("keeps the tip it was given, measured from its own corner", () => {
    const callout = sticky({ tail: { x: -30, y: 80 } });

    expect(roundTrip(callout)).toEqual(callout);
  });

  it("drops a tail stored in the old anchor shape instead of refusing it", () => {
    const parsed = parseOverlayEntry({ ...sticky(), tail: chartAnchor() });

    expect(parsed).toMatchObject({ kind: "sticky", tail: null });
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

  it("drops a tip it cannot read rather than refusing the sticky", () => {
    expect(
      parseOverlayEntry({ ...sticky(), tail: { x: "far", y: 2 } }),
    ).toMatchObject({ kind: "sticky", tail: null });
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
        sticky({ id: "c", tail: { x: 40, y: 120 } }),
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
