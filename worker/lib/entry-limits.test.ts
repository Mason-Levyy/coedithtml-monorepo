import type {
  CommentEntry,
  StickyEntry,
  TextAnchor,
} from "@coedithtml/protocol";
import { describe, expect, it } from "vitest";
import {
  entryWithinLimits,
  readerWithinLimits,
  MAX_BODY_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_ID_LENGTH,
  MAX_PATH_LENGTH,
  MAX_QUOTE_LENGTH,
} from "@/lib/entry-limits";

const TEXT_ANCHOR: TextAnchor = {
  kind: "text",
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
    anchor: TEXT_ANCHOR,
    body: "Net or gross?",
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-16T12:00:00.000Z",
    ...overrides,
  };
}

function sticky(): StickyEntry {
  return {
    ...comment(),
    kind: "sticky",
    anchor: {
      kind: "region",
      path: "figure[1]",
      fractionX: 0.5,
      fractionY: 0.5,
      revision: "r1",
    },
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    tail: null,
    textSize: "m",
  };
}

function tooLong(limit: number): string {
  return "x".repeat(limit + 1);
}

describe("what the room will store", () => {
  it("takes an ordinary entry", () => {
    expect(entryWithinLimits(comment())).toBe(true);
    expect(entryWithinLimits(sticky())).toBe(true);
  });

  it("refuses a body past the cap it always had", () => {
    expect(entryWithinLimits(comment({ body: tooLong(MAX_BODY_LENGTH) }))).toBe(
      false,
    );
  });

  // The whole point: a megabyte quote with an empty body used to pass every
  // check, five hundred times over.
  it("refuses a quote nobody could have selected", () => {
    const anchor: TextAnchor = {
      ...TEXT_ANCHOR,
      quote: tooLong(MAX_QUOTE_LENGTH),
    };

    expect(entryWithinLimits(comment({ body: "", anchor }))).toBe(false);
  });

  it("refuses an unbounded path, prefix, or suffix", () => {
    const oversized: TextAnchor[] = [
      { ...TEXT_ANCHOR, path: tooLong(MAX_PATH_LENGTH) },
      { ...TEXT_ANCHOR, prefix: tooLong(1000) },
      { ...TEXT_ANCHOR, suffix: tooLong(1000) },
    ];

    for (const anchor of oversized) {
      expect(entryWithinLimits(comment({ anchor }))).toBe(false);
    }
  });

  it("refuses an id used as storage", () => {
    expect(entryWithinLimits(comment({ id: tooLong(MAX_ID_LENGTH) }))).toBe(
      false,
    );
  });

  it("refuses a name nobody would answer to", () => {
    const author = {
      id: "r",
      displayName: tooLong(MAX_DISPLAY_NAME_LENGTH),
      source: "anonymous" as const,
    };

    expect(entryWithinLimits(comment({ author }))).toBe(false);
  });

  it("refuses a colour that is a payload", () => {
    expect(entryWithinLimits(comment({ fill: tooLong(32) }))).toBe(false);
  });

  it("holds a reader's presence to the same names and ids", () => {
    expect(readerWithinLimits({ id: "r1", displayName: "Sam" })).toBe(true);
    expect(
      readerWithinLimits({
        id: "r1",
        displayName: tooLong(MAX_DISPLAY_NAME_LENGTH),
      }),
    ).toBe(false);
    expect(
      readerWithinLimits({ id: tooLong(MAX_ID_LENGTH), displayName: "Sam" }),
    ).toBe(false);
  });
});
