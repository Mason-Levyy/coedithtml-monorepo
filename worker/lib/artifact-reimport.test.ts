import { describe, expect, it } from "vitest";
import type { StickyEntry } from "@coedithtml/protocol";
import { coeditStickiesIn, withoutCoeditPayload } from "./artifact-reimport";

function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
  return {
    kind: "sticky",
    id: "s1",
    parentId: null,
    anchor: {
      kind: "region",
      path: "body",
      fractionX: 0.5,
      fractionY: 0.5,
      revision: "old-revision",
    },
    body: "Looks great",
    author: { id: "reader-2", displayName: "Priya", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-13T12:00:00.000Z",
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    tail: null,
    ...overrides,
  };
}

function downloadedHtml(payload: unknown, bundle = 'console.log("bundle")'): string {
  return [
    "<html><body><p>Revenue grew 18%</p></body></html>",
    `\n<script>window.__coeditDownload__=${JSON.stringify(payload)};\n${bundle}</script>\n`,
  ].join("");
}

describe("coeditStickiesIn", () => {
  it("returns nothing for a file with no embedded payload", () => {
    expect(coeditStickiesIn("<html><body>hi</body></html>", "r2")).toEqual([]);
  });

  it("extracts and validates stickies from a previously downloaded file", () => {
    const html = downloadedHtml({ edits: [], stickies: [sticky()] });

    const found = coeditStickiesIn(html, "r2");

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: "s1", body: "Looks great" });
  });

  it("restamps the anchor revision to the newly uploaded artifact's", () => {
    const html = downloadedHtml({ edits: [], stickies: [sticky()] });

    const [found] = coeditStickiesIn(html, "new-revision");

    expect(found?.anchor).toMatchObject({ revision: "new-revision" });
  });

  it("leaves out edits, since they're already baked into the uploaded bytes", () => {
    const html = downloadedHtml({
      edits: [{ ...sticky(), kind: "edit", rev: 0 }],
      stickies: [sticky()],
    });

    const found = coeditStickiesIn(html, "r2");

    expect(found).toHaveLength(1);
    expect(found.every((entry) => entry.kind === "sticky")).toBe(true);
  });

  it("drops a sticky that fails validation instead of throwing", () => {
    const html = downloadedHtml({
      edits: [],
      stickies: [{ ...sticky(), color: "not-a-real-color" }],
    });

    expect(coeditStickiesIn(html, "r2")).toEqual([]);
  });

  it("fails open on a truncated or hand-edited payload", () => {
    const html = "<html><body>hi</body></html>\n<script>window.__coeditDownload__={not valid json";

    expect(coeditStickiesIn(html, "r2")).toEqual([]);
  });

  it("ignores a bare mention of the marker with no script boundary", () => {
    const html = "<p>window.__coeditDownload__= is what the runtime sets</p>";

    expect(coeditStickiesIn(html, "r2")).toEqual([]);
  });
});

describe("withoutCoeditPayload", () => {
  it("leaves a plain artifact byte-for-byte unchanged", () => {
    const html = "<html><body><p>Revenue grew 18%</p></body></html>";

    expect(withoutCoeditPayload(html)).toBe(html);
  });

  it("strips the injected script, restoring the artifact's own bytes", () => {
    const artifact = "<html><body><p>Revenue grew 18%</p></body></html>";
    const html = downloadedHtml({ edits: [], stickies: [sticky()] });

    expect(withoutCoeditPayload(html)).toBe(artifact);
  });

  it("strips an edits-only payload just the same, even with no stickies", () => {
    const artifact = "<html><body><p>Revenue grew 18%</p></body></html>";
    const html = downloadedHtml({ edits: [{ ...sticky(), kind: "edit", rev: 0 }], stickies: [] });

    expect(withoutCoeditPayload(html)).toBe(artifact);
  });

  it("does not touch content that merely mentions the marker in passing", () => {
    const html = "<p>window.__coeditDownload__ is a global the runtime sets</p>";

    expect(withoutCoeditPayload(html)).toBe(html);
  });
});
