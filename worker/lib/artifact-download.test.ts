import { describe, expect, it } from "vitest";
import type {
  CommentEntry,
  EditEntry,
  StickyEntry,
} from "@coedithtml/protocol";
import {
  appendToArtifact,
  downloadChoiceIn,
  downloadFileName,
  downloadScript,
  feedbackSection,
} from "./artifact-download";

const ARTIFACT = "<html><body><P CLASS=lead>Revenue grew 18%</P></body></html>";

const ANCHOR = {
  kind: "text" as const,
  quote: "Revenue grew 18%",
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
    author: { id: "reader-1", displayName: "Priya", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-13T12:00:00.000Z",
    ...overrides,
  };
}

function textEdit(overrides: Partial<EditEntry> = {}): EditEntry {
  return {
    ...comment(),
    kind: "edit",
    id: "e1",
    body: "Revenue fell 4%",
    rev: 0,
    ...overrides,
  };
}

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
      revision: "r1",
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

function decode(bytes: ArrayBuffer): string {
  return new TextDecoder().decode(bytes);
}

function artifactBytes(): ArrayBuffer {
  return new TextEncoder().encode(ARTIFACT).buffer as ArrayBuffer;
}

describe("appendToArtifact", () => {
  it("leaves the uploaded bytes exactly as they were", () => {
    const out = decode(appendToArtifact(artifactBytes(), "<!-- after -->"));

    expect(out.startsWith(ARTIFACT)).toBe(true);
    expect(out).toContain("<P CLASS=lead>");
  });

  it("adds nothing at all when there is nothing to add", () => {
    expect(decode(appendToArtifact(artifactBytes(), "", ""))).toBe(ARTIFACT);
  });
});

describe("downloadScript", () => {
  it("carries the edits and the bundle that applies them", () => {
    const script = downloadScript([textEdit()], "APPLY();", "edits");

    expect(script).toContain("window.__coeditDownload__=");
    expect(script).toContain("Revenue fell 4%");
    expect(script).toContain("APPLY();");
  });

  it("writes nothing when the file was never edited or annotated", () => {
    expect(downloadScript([comment()], "APPLY();", "edits")).toBe("");
  });

  it("cannot be broken out of by an edit that contains a closing tag", () => {
    const script = downloadScript(
      [textEdit({ body: "</script><script>alert(1)</script>" })],
      "APPLY();",
      "edits",
    );
    const opened = script.match(/<script/g) ?? [];

    expect(opened).toHaveLength(1);
    expect(script).toContain("\\u003c/script");
  });

  it("carries stickies for the everything choice", () => {
    const script = downloadScript([sticky()], "APPLY();", "everything");

    expect(script).toContain("Looks great");
  });

  it("leaves stickies out for the edits-only choice", () => {
    const script = downloadScript([sticky()], "APPLY();", "edits");

    expect(script).toBe("");
  });

  it("leaves stickies out of the feedback choice, which is markdown, not this HTML script", () => {
    const script = downloadScript([sticky()], "APPLY();", "feedback");

    expect(script).toBe("");
  });
});

describe("feedbackSection", () => {
  it("lists the comments", () => {
    const section = feedbackSection([comment()]);

    expect(section).toContain("Net or gross?");
    expect(section).toContain("Priya");
  });

  it("says nothing about text changes, which are already in the document", () => {
    const section = feedbackSection([comment(), textEdit()]);

    expect(section).not.toContain("Revenue fell 4%");
    expect(section).not.toContain("<del>");
  });

  it("writes nothing for a file that was only edited", () => {
    expect(feedbackSection([textEdit()])).toBe("");
  });

  it("says nothing about stickies, which are painted onto the page itself", () => {
    const section = feedbackSection([comment(), sticky()]);

    expect(section).not.toContain("Looks great");
  });

  it("writes nothing for a file that only has sticky notes", () => {
    expect(feedbackSection([sticky()])).toBe("");
  });

  it("escapes a comment that contains markup", () => {
    const section = feedbackSection([
      comment({ body: "<img src=x onerror=alert(1)>" }),
    ]);

    expect(section).not.toContain("<img");
    expect(section).toContain("&lt;img");
  });

  it("writes nothing for an overlay nobody has touched", () => {
    expect(feedbackSection([])).toBe("");
  });
});

describe("downloadFileName", () => {
  it("names each download for what is in it", () => {
    expect(downloadFileName("deck.html", "edits")).toBe("deck-edited.html");
    expect(downloadFileName("deck.html", "everything")).toBe(
      "deck-with-feedback.html",
    );
    expect(downloadFileName("deck.html", "feedback")).toBe("deck-feedback.md");
  });
});

describe("downloadChoiceIn", () => {
  it("reads the choices it offers and refuses anything else", () => {
    expect(downloadChoiceIn("edits")).toBe("edits");
    expect(downloadChoiceIn("everything")).toBe("everything");
    expect(downloadChoiceIn(null)).toBeNull();
    expect(downloadChoiceIn("../../etc/passwd")).toBeNull();
  });
});
