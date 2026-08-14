import { beforeEach, describe, expect, it } from "vitest";
import type { EditEntry } from "@coedithtml/protocol";
import { applyEdits } from "./apply";

function edit(quote: string, body: string, id = "e1"): EditEntry {
  return {
    kind: "edit",
    id,
    parentId: null,
    anchor: {
      kind: "text",
      quote,
      prefix: "",
      suffix: "",
      path: "p[1]",
      revision: "r1",
    },
    body,
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    rev: 0,
    createdAt: "2026-08-13T12:00:00.000Z",
  };
}

function load(html: string): void {
  document.body.innerHTML = html;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("applyEdits", () => {
  it("replaces the anchored words and leaves the rest alone", () => {
    load("<p>Revenue grew 18% this quarter.</p>");
    const outcome = applyEdits(document.body, [edit("grew 18%", "fell 4%")]);

    expect(document.body.innerHTML).toBe(
      "<p>Revenue fell 4% this quarter.</p>",
    );
    expect(outcome.applied).toEqual(["e1"]);
  });

  it("keeps the artifact's own markup around the text it changes", () => {
    load("<p>Revenue <strong>grew</strong> a lot.</p>");
    applyEdits(document.body, [edit("grew", "fell")]);

    expect(document.body.innerHTML).toBe(
      "<p>Revenue <strong>fell</strong> a lot.</p>",
    );
  });

  it("refuses an edit spanning markup rather than destroying it", () => {
    load("<p>Revenue <strong>grew</strong> a lot.</p>");
    const outcome = applyEdits(document.body, [
      edit("Revenue grew", "Revenue fell"),
    ]);

    expect(document.body.innerHTML).toBe(
      "<p>Revenue <strong>grew</strong> a lot.</p>",
    );
    expect(outcome.unplaced).toEqual(["e1"]);
  });

  it("reports an edit whose words are no longer there", () => {
    load("<p>Nothing like it here.</p>");
    const outcome = applyEdits(document.body, [
      edit("Revenue grew", "Revenue fell"),
    ]);

    expect(outcome).toEqual({ applied: [], unplaced: ["e1"] });
  });

  it("applies several edits in one pass without shifting each other", () => {
    load("<p>Alpha and beta and gamma.</p>");
    const outcome = applyEdits(document.body, [
      edit("Alpha", "One", "e1"),
      edit("gamma", "Three", "e2"),
    ]);

    expect(document.body.textContent).toBe("One and beta and Three.");
    expect(outcome.applied).toEqual(["e1", "e2"]);
  });

  it("keeps the first of two edits that want the same words", () => {
    load("<p>Revenue grew a lot.</p>");
    const outcome = applyEdits(document.body, [
      edit("grew", "fell", "first"),
      edit("grew a lot", "held steady", "second"),
    ]);

    expect(document.body.textContent).toBe("Revenue fell a lot.");
    expect(outcome).toEqual({ applied: ["first"], unplaced: ["second"] });
  });

  it("leaves script and style content untouched", () => {
    load("<p>Revenue grew.</p><script>var grew = 1;</script>");
    applyEdits(document.body, [edit("grew", "fell")]);

    expect(document.querySelector("script")?.textContent).toBe("var grew = 1;");
  });

  it("applies an edit written against what an earlier edit produced", () => {
    load("<p>Revenue grew 18%.</p>");

    const outcome = applyEdits(document.body, [
      edit("grew", "fell", "first"),
      edit("fell 18%", "fell 4%", "second"),
    ]);

    expect(document.body.textContent).toBe("Revenue fell 4%.");
    expect(outcome.applied).toEqual(["first", "second"]);
  });

  it("keeps going when one edit in the middle no longer resolves", () => {
    load("<p>Alpha and gamma.</p>");

    const outcome = applyEdits(document.body, [
      edit("Alpha", "One", "first"),
      edit("beta", "Two", "missing"),
      edit("gamma", "Three", "third"),
    ]);

    expect(document.body.textContent).toBe("One and Three.");
    expect(outcome).toEqual({
      applied: ["first", "third"],
      unplaced: ["missing"],
    });
  });
});
