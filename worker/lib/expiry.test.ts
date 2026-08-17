import { describe, expect, it } from "vitest";
import type { ArtifactMetadata } from "@/lib/artifact-metadata";
import {
  IDLE_DAYS,
  UNUSED_DAYS,
  expiresAtOf,
  isMeaningfulView,
  shouldRecordView,
  verdictFor,
} from "@/lib/expiry";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-16T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}

function artifact(overrides: Partial<ArtifactMetadata> = {}): ArtifactMetadata {
  return {
    fileName: "deck.html",
    size: 1024,
    uploadedAt: daysAgo(1),
    revision: "aaaa1111bbbb2222",
    previousRevisions: [],
    blobs: {},
    meaningfulViews: 1,
    published: true,
    ...overrides,
  };
}

describe("deciding what to keep", () => {
  it("keeps a file somebody read this week", () => {
    expect(verdictFor(artifact({ lastViewedAt: daysAgo(2) }), NOW)).toBe(
      "keep",
    );
  });

  it("expires a file nobody has opened in a month", () => {
    expect(
      verdictFor(artifact({ lastViewedAt: daysAgo(IDLE_DAYS + 1) }), NOW),
    ).toBe("idle");
  });

  it("warns before the sweep rather than after it", () => {
    expect(
      verdictFor(artifact({ lastViewedAt: daysAgo(IDLE_DAYS - 3) }), NOW),
    ).toBe("warn");
  });

  it("counts the upload as activity when nothing has been read yet", () => {
    expect(
      verdictFor(artifact({ uploadedAt: daysAgo(IDLE_DAYS + 1) }), NOW),
    ).toBe("idle");
  });

  it("sweeps a file uploaded a week ago that nobody ever opened", () => {
    const forgotten = artifact({
      uploadedAt: daysAgo(UNUSED_DAYS + 1),
      meaningfulViews: 0,
    });

    expect(verdictFor(forgotten, NOW)).toBe("unused");
  });

  it("keeps a file uploaded a week ago that somebody did open", () => {
    const read = artifact({
      uploadedAt: daysAgo(UNUSED_DAYS + 1),
      lastViewedAt: daysAgo(1),
      meaningfulViews: 3,
    });

    expect(verdictFor(read, NOW)).toBe("keep");
  });

  it("gives a new file its week before deciding anything", () => {
    expect(
      verdictFor(artifact({ uploadedAt: daysAgo(2), meaningfulViews: 0 }), NOW),
    ).toBe("keep");
  });

  it("keeps a file whose dates it cannot read rather than guessing", () => {
    expect(verdictFor(artifact({ uploadedAt: "not a date" }), NOW)).toBe(
      "keep",
    );
  });

  it("names the date the owner has until", () => {
    const warned = artifact({ lastViewedAt: daysAgo(IDLE_DAYS - 3) });

    expect(expiresAtOf(warned)).toBe(new Date(NOW + 3 * DAY).toISOString());
  });
});

describe("which views count", () => {
  // The uploader opening their own link to check it worked is not use, and
  // counting it would keep every abandoned file alive for ever.
  it("does not count the uploader checking their own link", () => {
    const fresh = artifact({ uploadedAt: new Date(NOW).toISOString() });

    expect(isMeaningfulView(fresh, NOW + 60_000)).toBe(false);
  });

  it("counts a view an hour after the upload", () => {
    const fresh = artifact({ uploadedAt: new Date(NOW).toISOString() });

    expect(isMeaningfulView(fresh, NOW + 2 * 60 * 60 * 1000)).toBe(true);
  });

  it("records the first view whatever the clock says", () => {
    expect(shouldRecordView(artifact(), NOW)).toBe(true);
  });

  it("writes down at most one view an hour, however many arrive", () => {
    const justRead = artifact({
      lastViewedAt: new Date(NOW - 60_000).toISOString(),
    });

    expect(shouldRecordView(justRead, NOW)).toBe(false);
  });

  it("writes again once an hour has gone by", () => {
    const readEarlier = artifact({
      lastViewedAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    });

    expect(shouldRecordView(readEarlier, NOW)).toBe(true);
  });
});
