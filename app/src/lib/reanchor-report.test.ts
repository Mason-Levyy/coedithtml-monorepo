import { describe, expect, it } from "vitest";
import type { MarkPlacement } from "@/hooks/useArtifactBridge";
import type { CommentEntry, OverlayEntry, ReplyEntry } from "@/lib/protocol";
import { describeReanchoring, reanchorCounts } from "./reanchor-report";

const ANCHOR = {
  kind: "text" as const,
  quote: "Revenue grew 18%",
  prefix: "",
  suffix: " this quarter.",
  path: "p[1]",
  revision: "r1",
};

const AUTHOR = {
  id: "reader-1",
  displayName: "Sam",
  source: "anonymous" as const,
};

function comment(id: string): CommentEntry {
  return {
    kind: "comment",
    id,
    parentId: null,
    anchor: ANCHOR,
    body: "Net or gross?",
    author: AUTHOR,
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
  };
}

function reply(id: string, parentId: string): ReplyEntry {
  return { ...comment(id), kind: "reply", parentId };
}

function placement(overrides: Partial<MarkPlacement> = {}): MarkPlacement {
  return { offscreen: [], hidden: [], orphaned: [], ...overrides };
}

function countOf(entries: OverlayEntry[], marks: MarkPlacement) {
  return reanchorCounts(entries, marks);
}

describe("reanchorCounts", () => {
  it("counts every thread as carried over when nothing is orphaned", () => {
    expect(countOf([comment("c1"), comment("c2")], placement())).toEqual({
      total: 2,
      placed: 2,
      needReview: 0,
    });
  });

  it("moves an orphaned thread into the review count", () => {
    expect(
      countOf([comment("c1"), comment("c2")], placement({ orphaned: ["c2"] })),
    ).toEqual({ total: 2, placed: 1, needReview: 1 });
  });

  it("counts threads, not replies", () => {
    expect(countOf([comment("c1"), reply("r1", "c1")], placement())).toEqual({
      total: 1,
      placed: 1,
      needReview: 0,
    });
  });

  it("ignores an orphan id that is no longer in the overlay", () => {
    expect(countOf([comment("c1")], placement({ orphaned: ["gone"] }))).toEqual(
      { total: 1, placed: 1, needReview: 0 },
    );
  });

  it("does not treat merely off-screen or hidden marks as lost", () => {
    expect(
      countOf(
        [comment("c1"), comment("c2")],
        placement({ offscreen: ["c1"], hidden: ["c2"] }),
      ),
    ).toEqual({ total: 2, placed: 2, needReview: 0 });
  });
});

describe("describeReanchoring", () => {
  it("says so plainly when everything carried over", () => {
    expect(describeReanchoring({ total: 3, placed: 3, needReview: 0 })).toBe(
      "New version loaded. All 3 carried over.",
    );
  });

  it("names both numbers when some need review", () => {
    expect(describeReanchoring({ total: 14, placed: 11, needReview: 3 })).toBe(
      "New version loaded. 11 of 14 carried over, 3 need review.",
    );
  });

  it("does not claim a count when there was no feedback", () => {
    expect(describeReanchoring({ total: 0, placed: 0, needReview: 0 })).toBe(
      "New version loaded. There was no feedback to carry over.",
    );
  });
});
