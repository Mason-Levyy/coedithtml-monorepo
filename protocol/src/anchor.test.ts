import { describe, expect, it } from "vitest";
import {
  anchorFromText,
  CONTEXT_LENGTH,
  EXCERPT_LENGTH,
  normalizeAnchorText,
  regionAnchor,
  resolveAnchorInText,
  type TextAnchor,
} from "./anchor";

const REVISION = "rev-1";

function anchorOn(text: string, quote: string): TextAnchor {
  const start = text.indexOf(quote);
  const anchor = anchorFromText({
    text,
    start,
    end: start + quote.length,
    path: "body/div[1]/p[2]",
    revision: REVISION,
  });
  if (anchor === null) {
    throw new Error(`could not anchor on ${quote}`);
  }
  return anchor;
}

function resolvedText(text: string, anchor: TextAnchor): string | null {
  const resolution = resolveAnchorInText(text, anchor);
  return resolution.ok ? text.slice(resolution.start, resolution.end) : null;
}

describe("normalizeAnchorText", () => {
  it("collapses the whitespace that markup carries but rendering hides", () => {
    expect(normalizeAnchorText("  Revenue\n   grew\t18% ")).toBe(
      "Revenue grew 18%",
    );
  });
});

describe("anchorFromText", () => {
  const text = "Revenue grew. Churn held flat at 2.1%.";

  it("captures the quote with context either side", () => {
    const anchor = anchorOn(text, "Churn held flat");

    expect(anchor.quote).toBe("Churn held flat");
    expect(anchor.prefix).toBe("Revenue grew. ");
    expect(anchor.suffix).toBe(" at 2.1%.");
    expect(anchor.revision).toBe(REVISION);
  });

  it("caps context so an anchor cannot grow with the document", () => {
    const long = `${"a".repeat(200)}QUOTE${"b".repeat(200)}`;
    const anchor = anchorOn(long, "QUOTE");

    expect(anchor.prefix).toBe("a".repeat(CONTEXT_LENGTH));
    expect(anchor.suffix).toBe("b".repeat(CONTEXT_LENGTH));
  });

  it("refuses a selection with no words in it", () => {
    expect(
      anchorFromText({
        text: "   ",
        start: 0,
        end: 3,
        path: "",
        revision: REVISION,
      }),
    ).toBeNull();
  });

  it("refuses a range that is empty or out of bounds", () => {
    const base = { text, path: "", revision: REVISION };

    expect(anchorFromText({ ...base, start: 5, end: 5 })).toBeNull();
    expect(anchorFromText({ ...base, start: 5, end: 4 })).toBeNull();
    expect(anchorFromText({ ...base, start: -1, end: 4 })).toBeNull();
    expect(anchorFromText({ ...base, start: 0, end: 9999 })).toBeNull();
  });
});

describe("regionAnchor", () => {
  const base = { path: "body/figure[1]/img[1]", revision: REVISION };

  it("anchors a point on a chart that carries no quotable text", () => {
    expect(regionAnchor({ ...base, fractionX: 0.25, fractionY: 0.8 })).toEqual({
      kind: "region",
      path: "body/figure[1]/img[1]",
      fractionX: 0.25,
      fractionY: 0.8,
      revision: REVISION,
    });
  });

  it("keeps the corners, which are where people circle things", () => {
    expect(
      regionAnchor({ ...base, fractionX: 0, fractionY: 1 }),
    ).not.toBeNull();
  });

  it("refuses a point outside the element it claims to be inside", () => {
    expect(
      regionAnchor({ ...base, fractionX: 1.4, fractionY: 0.5 }),
    ).toBeNull();
    expect(regionAnchor({ ...base, fractionX: 0.5, fractionY: -0.1 })).toBe(
      null,
    );
    expect(
      regionAnchor({ ...base, fractionX: Number.NaN, fractionY: 0.5 }),
    ).toBeNull();
  });

  it("refuses an anchor with no element to hang off", () => {
    expect(
      regionAnchor({ ...base, path: "", fractionX: 0.5, fractionY: 0.5 }),
    ).toBeNull();
  });

  it("carries an excerpt of what the note was dropped on", () => {
    const anchor = regionAnchor({
      ...base,
      fractionX: 0.5,
      fractionY: 0.5,
      excerpt: "  Revenue\n  grew 18%  ",
    });

    expect(anchor?.excerpt).toBe("Revenue grew 18%");
  });

  it("caps the excerpt so an anchor cannot grow with its document", () => {
    const anchor = regionAnchor({
      ...base,
      fractionX: 0.5,
      fractionY: 0.5,
      excerpt: "word ".repeat(200),
    });

    expect(anchor?.excerpt?.length).toBeLessThanOrEqual(EXCERPT_LENGTH + 1);
    expect(anchor?.excerpt?.endsWith("…")).toBe(true);
  });

  it("omits the excerpt for an element with no text of its own", () => {
    const anchor = regionAnchor({
      ...base,
      fractionX: 0.5,
      fractionY: 0.5,
      excerpt: "   \n  ",
    });

    expect(anchor).not.toBeNull();
    expect(anchor).not.toHaveProperty("excerpt");
  });
});

describe("resolveAnchorInText", () => {
  const text = "Revenue grew 18% year over year. Churn held flat at 2.1%.";

  it("finds the quote it was built from", () => {
    const anchor = anchorOn(text, "Churn held flat");

    expect(resolvedText(text, anchor)).toBe("Churn held flat");
  });

  it("orphans a quote that is no longer there", () => {
    const anchor = anchorOn(text, "Churn held flat");

    expect(resolveAnchorInText("Revenue grew 18%.", anchor)).toEqual({
      ok: false,
      reason: "orphaned",
    });
  });

  it("reports ambiguity rather than picking, when context cannot separate", () => {
    const anchor = anchorOn("Ship it", "Ship it");
    const resolution = resolveAnchorInText("Ship it and Ship it", anchor);

    expect(resolution).toEqual({
      ok: false,
      reason: "ambiguous",
      matches: [0, 12],
    });
  });

  it("lets context beat a copy with none of it", () => {
    const anchor = anchorOn("we agreed. Ship it. done.", "Ship it");
    const regenerated = "Ship it and we agreed. Ship it";

    const resolution = resolveAnchorInText(regenerated, anchor);

    expect(resolution.ok && resolution.start).toBe(
      regenerated.lastIndexOf("Ship it"),
    );
  });
});

describe("anchor drift after a model regenerates the artifact", () => {
  const original =
    "Q3 Review Revenue grew 18% year over year. Churn held flat at 2.1%. " +
    "Next quarter we double down on retention.";

  it("survives markup rewritten around identical wording", () => {
    const anchor = anchorOn(original, "Churn held flat at 2.1%.");
    const regenerated =
      "Q3 Review — Overview Revenue grew 18% year over year. " +
      "Churn held flat at 2.1%. Next quarter we double down on retention. Appendix";

    expect(resolvedText(regenerated, anchor)).toBe("Churn held flat at 2.1%.");
  });

  it("orphans an edited passage instead of moving the comment somewhere wrong", () => {
    const anchor = anchorOn(original, "Churn held flat at 2.1%.");
    const regenerated =
      "Q3 Review Revenue grew 18% year over year. Churn rose to 2.9%. " +
      "Next quarter we double down on retention.";

    expect(resolveAnchorInText(regenerated, anchor)).toEqual({
      ok: false,
      reason: "orphaned",
    });
  });

  it("orphans a deleted passage", () => {
    const anchor = anchorOn(original, "Churn held flat at 2.1%.");
    const regenerated =
      "Q3 Review Revenue grew 18% year over year. " +
      "Next quarter we double down on retention.";

    expect(resolveAnchorInText(regenerated, anchor)).toEqual({
      ok: false,
      reason: "orphaned",
    });
  });

  it("uses context to tell two copies of the same sentence apart", () => {
    const twice =
      "Summary We double down on retention. Detail We double down on retention.";
    const secondCopy = twice.lastIndexOf("We double down on retention.");
    const anchor = anchorFromText({
      text: twice,
      start: secondCopy,
      end: secondCopy + "We double down on retention.".length,
      path: "body/section[2]/p[1]",
      revision: REVISION,
    });
    if (anchor === null) {
      throw new Error("could not build the anchor");
    }

    const resolution = resolveAnchorInText(twice, anchor);

    expect(resolution.ok && resolution.start).toBe(secondCopy);
  });

  it("still separates the copies when the wording around them is rewritten", () => {
    const twice =
      "Summary We double down on retention. Detail We double down on retention.";
    const secondCopy = twice.lastIndexOf("We double down on retention.");
    const anchor = anchorFromText({
      text: twice,
      start: secondCopy,
      end: secondCopy + "We double down on retention.".length,
      path: "body/section[2]/p[1]",
      revision: REVISION,
    });
    if (anchor === null) {
      throw new Error("could not build the anchor");
    }

    const regenerated =
      "Overview We double down on retention. In detail We double down on retention.";
    const resolution = resolveAnchorInText(regenerated, anchor);

    expect(resolution.ok && resolution.start).toBe(
      regenerated.lastIndexOf("We double down on retention."),
    );
  });
});
