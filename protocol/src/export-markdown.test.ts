import { describe, expect, it } from "vitest";
import { overlayToMarkdown } from "./export-markdown";
import type {
  Author,
  CommentEntry,
  EditEntry,
  OverlayEntry,
  ReplyEntry,
  StickyEntry,
} from "./overlay";

const AUTHOR: Author = {
  id: "reader-1",
  displayName: "Priya",
  source: "anonymous",
};

const TEXT_ANCHOR = {
  kind: "text" as const,
  quote: "Revenue grew 18%",
  prefix: "",
  suffix: " this quarter.",
  path: "p[1]",
  revision: "r1",
};

const REGION_ANCHOR = {
  kind: "region" as const,
  path: "figure[1]",
  fractionX: 0.5,
  fractionY: 0.5,
  revision: "r1",
};

function comment(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    kind: "comment",
    id: "c1",
    parentId: null,
    anchor: TEXT_ANCHOR,
    body: "Net or gross?",
    author: AUTHOR,
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
    ...overrides,
  };
}

function reply(overrides: Partial<ReplyEntry> = {}): ReplyEntry {
  return {
    ...comment(),
    kind: "reply",
    parentId: "c1",
    id: "r1",
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
    ...comment(),
    kind: "sticky",
    id: "s1",
    anchor: REGION_ANCHOR,
    body: "Swap this chart for the cohort view",
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    tail: null,
    ...overrides,
  };
}

function render(entries: OverlayEntry[], orphaned: string[] = []): string {
  return overlayToMarkdown({ fileName: "q3-review.html", entries, orphaned });
}

describe("overlayToMarkdown", () => {
  it("returns nothing at all for an overlay with no threads", () => {
    expect(render([])).toBe("");
  });

  it("names the file and counts what is open", () => {
    const markdown = render([comment(), comment({ id: "c2" })]);

    expect(markdown).toContain("# Feedback on q3-review.html");
    expect(markdown).toContain("2 threads, 2 still open.");
  });

  it("quotes the text a comment points at", () => {
    expect(render([comment()])).toContain('## On "Revenue grew 18%"');
  });

  it("puts a reply under the comment it answers", () => {
    const markdown = render([
      comment(),
      reply({
        body: "Gross.",
        author: { ...AUTHOR, id: "reader-2", displayName: "Sam" },
      }),
    ]);

    expect(markdown.indexOf("**Priya:** Net or gross?")).toBeLessThan(
      markdown.indexOf("**Sam:** Gross."),
    );
  });

  it("describes a sticky rather than quoting an anchor it has no text for", () => {
    const markdown = render([sticky()]);

    expect(markdown).toContain("## Sticky note");
    expect(markdown).toContain(
      "**Priya:** Swap this chart for the cohort view",
    );
  });

  it("marks a resolved thread rather than dropping it", () => {
    const markdown = render([comment({ status: "resolved" })]);

    expect(markdown).toContain('## On "Revenue grew 18%" (resolved)');
    expect(markdown).toContain("1 thread, 0 still open.");
  });

  it("separates threads whose anchor no longer resolves", () => {
    const markdown = render([comment(), comment({ id: "c2" })], ["c2"]);
    const unplacedAt = markdown.indexOf("## Unplaced");

    expect(unplacedAt).toBeGreaterThan(-1);
    expect(markdown).toContain(
      "These were left on content that is no longer in the file.",
    );
    expect(markdown.slice(unplacedAt)).toContain("### On");
  });

  it("omits the unplaced section when nothing is unplaced", () => {
    expect(render([comment()])).not.toContain("Unplaced");
  });

  it("collapses a quote that spans lines so the heading stays one line", () => {
    const markdown = render([
      comment({
        anchor: { ...TEXT_ANCHOR, quote: "Revenue grew\n  18%\tthis year" },
      }),
    ]);

    expect(markdown).toContain('## On "Revenue grew 18% this year"');
  });

  it("names an author who never gave a name", () => {
    expect(
      render([comment({ author: { ...AUTHOR, displayName: "" } })]),
    ).toContain("**Someone:**");
  });

  it("keeps the heading of a thread whose body is empty", () => {
    const markdown = render([sticky({ body: "   " })]);

    expect(markdown).toContain("## Sticky note");
    expect(markdown).not.toContain("**Priya:**");
  });

  it("ends with exactly one newline", () => {
    expect(render([comment()]).endsWith("?\n")).toBe(true);
  });

  it("carries text changes, so the model keeps them instead of undoing them", () => {
    const markdown = render([textEdit()]);

    expect(markdown).toContain("## Text already changed");
    expect(markdown).toContain('### "Revenue grew 18%" → "Revenue fell 4%"');
    expect(markdown).toContain("Changed by Priya.");
  });

  it("counts changes beside threads", () => {
    const markdown = render([comment(), textEdit()]);

    expect(markdown).toContain(
      "1 thread, 1 still open. 1 text change already made.",
    );
  });

  it("says nothing about changes when there are none", () => {
    expect(render([comment()])).not.toContain("text change");
  });

  it("exports an artifact that was edited but never commented on", () => {
    const markdown = render([textEdit()]);

    expect(markdown).toContain("# Feedback on q3-review.html");
    expect(markdown).toContain("0 threads, 0 still open.");
  });

  it("keeps an edit out of the thread list it does not belong in", () => {
    const markdown = render([textEdit()]);

    expect(markdown).not.toContain('## On "Revenue grew 18%"');
  });
});
