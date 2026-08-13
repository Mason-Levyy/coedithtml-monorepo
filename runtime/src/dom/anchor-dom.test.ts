import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAnchorInText, type TextAnchor } from "@coedithtml/protocol";
import {
  anchorFromRange,
  pointForRegionAnchor,
  rangeForTextAnchor,
  regionAnchorAtPoint,
} from "./anchor-dom";
import { OVERLAY_HOST_ATTRIBUTE } from "./constants";
import { buildTextIndex, rangeForOffsets, type TextIndex } from "./text-index";

const REVISION = "rev-1";

function render(html: string): TextIndex {
  document.body.innerHTML = html;
  return buildTextIndex(document.body);
}

function anchorOnQuote(
  index: TextIndex,
  quote: string,
  occurrence = 0,
): TextAnchor {
  let start = -1;
  for (let seen = 0; seen <= occurrence; seen += 1) {
    start = index.text.indexOf(quote, start + 1);
  }
  const range = rangeForOffsets(index, start, start + quote.length);
  if (range === null) {
    throw new Error("could not build a range for the quote");
  }
  const anchor = anchorFromRange(index, range, REVISION);
  if (anchor === null) {
    throw new Error("could not build an anchor for the range");
  }
  return anchor;
}

const COPIES = 12;

function repeatedSections(): string {
  return Array.from(
    { length: COPIES },
    () => `<section><p>Ship it</p></section>`,
  ).join("");
}

function tiedCandidates(index: TextIndex, anchor: TextAnchor): number {
  const resolution = resolveAnchorInText(index.text, anchor);
  return resolution.ok || resolution.reason === "orphaned"
    ? 1
    : resolution.matches.length;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("anchorFromRange", () => {
  it("records the selected words and the element holding them", () => {
    const index = render(
      `<div><p>Revenue grew 18%</p><p>Churn held flat</p></div>`,
    );

    const anchor = anchorOnQuote(index, "Churn held");

    expect(anchor.quote).toBe("Churn held");
    expect(anchor.path).toBe("div[1]/p[2]");
    expect(anchor.revision).toBe(REVISION);
  });

  it("refuses a collapsed selection", () => {
    const index = render(`<p>Revenue grew</p>`);
    const range = document.createRange();
    range.setStart(document.body, 0);
    range.collapse(true);

    expect(anchorFromRange(index, range, REVISION)).toBeNull();
  });
});

describe("rangeForTextAnchor", () => {
  it("finds the words it was built from", () => {
    const index = render(`<p>Revenue grew 18%</p><p>Churn held flat</p>`);
    const anchor = anchorOnQuote(index, "Churn held");

    expect(rangeForTextAnchor(index, anchor)?.toString()).toBe("Churn held");
  });

  it("survives the markup being rewritten around the same words", () => {
    const before = render(`<p>Revenue grew 18%</p><p>Churn held flat</p>`);
    const anchor = anchorOnQuote(before, "Churn held");

    const after = render(
      `<section><h2>Revenue grew 18%</h2><div><span>Churn held flat</span></div></section>`,
    );

    expect(rangeForTextAnchor(after, anchor)?.toString()).toBe("Churn held");
  });

  it("orphans words that are gone rather than moving the mark", () => {
    const before = render(`<p>Churn held flat</p>`);
    const anchor = anchorOnQuote(before, "Churn held");

    const after = render(`<p>Churn rose sharply</p>`);

    expect(rangeForTextAnchor(after, anchor)).toBeNull();
  });

  it("breaks a context tie using the path, which text alone cannot", () => {
    const index = render(repeatedSections());
    const anchor = anchorOnQuote(index, "Ship it", 4);
    expect(anchor.path).toBe("section[5]/p[1]");
    expect(tiedCandidates(index, anchor)).toBeGreaterThan(1);

    const range = rangeForTextAnchor(index, anchor);

    expect(range?.startContainer.parentElement).toBe(
      document.querySelector("section:nth-of-type(5) p"),
    );
  });

  it("stays orphaned when neither text nor path can single one out", () => {
    const index = render(repeatedSections());
    const anchor = anchorOnQuote(index, "Ship it", 4);

    const flattened = render(
      `<div>${Array.from({ length: COPIES }, () => `<span>Ship it </span>`).join("")}</div>`,
    );

    expect(rangeForTextAnchor(flattened, anchor)).toBeNull();
  });
});

describe("region anchors", () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };

  function stubStack(...stack: Element[]): void {
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: () => stack,
    });
  }

  function stubChart(): Element {
    document.body.innerHTML = `<figure><img alt="chart" /></figure>`;
    const chart = document.querySelector("img");
    if (chart === null) {
      throw new Error("no chart");
    }
    vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
      ...box,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
      toJSON: () => ({}),
    });
    stubStack(chart);
    return chart;
  }

  it("anchors a point on a chart that carries no quotable text", () => {
    stubChart();

    expect(regionAnchorAtPoint(150, 100, REVISION)).toEqual({
      kind: "region",
      path: "figure[1]/img[1]",
      fractionX: 0.25,
      fractionY: 0.5,
      revision: REVISION,
    });
  });

  it("returns the same point when the chart is where it was", () => {
    stubChart();
    const anchor = regionAnchorAtPoint(150, 100, REVISION);
    if (anchor === null) {
      throw new Error("could not anchor on the chart");
    }

    expect(pointForRegionAnchor(anchor)).toEqual({ x: 150, y: 100 });
  });

  it("gives up when the element the tail pointed at is gone", () => {
    stubChart();
    const anchor = regionAnchorAtPoint(150, 100, REVISION);
    if (anchor === null) {
      throw new Error("could not anchor on the chart");
    }
    document.body.innerHTML = `<p>The chart was replaced by a table</p>`;

    expect(pointForRegionAnchor(anchor)).toBeNull();
  });

  it("anchors through a painted mark rather than onto our own host", () => {
    const chart = stubChart();
    const host = document.createElement("div");
    host.setAttribute(OVERLAY_HOST_ATTRIBUTE, "");
    document.body.appendChild(host);
    stubStack(host, chart);

    expect(regionAnchorAtPoint(150, 100, REVISION)?.path).toBe(
      "figure[1]/img[1]",
    );
  });

  it("refuses a point that only hits the document element", () => {
    document.body.innerHTML = `<p>Body with a margin</p>`;
    stubStack(document.documentElement);

    expect(regionAnchorAtPoint(5, 5, REVISION)).toBeNull();
  });
});
