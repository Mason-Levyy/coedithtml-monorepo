import { beforeEach, describe, expect, it } from "vitest";
import { OVERLAY_HOST_ATTRIBUTE } from "./constants";
import {
  buildTextIndex,
  offsetsForRange,
  rangeForOffsets,
  type TextIndex,
} from "./text-index";

function render(html: string): TextIndex {
  document.body.innerHTML = html;
  return buildTextIndex(document.body);
}

function textNodeIn(selector: string): Text {
  const first = document.querySelector(selector)?.firstChild;
  if (first === null || first === undefined) {
    throw new Error(`no text node in ${selector}`);
  }
  return first as Text;
}

function selectedText(index: TextIndex, range: Range): string {
  const offsets = offsetsForRange(index, range);
  if (offsets === null) {
    throw new Error("the range did not map to any offsets");
  }
  return index.text.slice(offsets.start, offsets.end);
}

function rangeFor(index: TextIndex, quote: string): Range {
  const start = index.text.indexOf(quote);
  const range = rangeForOffsets(index, start, start + quote.length);
  if (range === null) {
    throw new Error("the offsets did not map to a range");
  }
  return range;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("buildTextIndex", () => {
  it("collapses the whitespace that markup carries between elements", () => {
    const index = render(`
      <h1>Q3   Review</h1>
      <p>Revenue grew
         18%.</p>
    `);

    expect(index.text).toBe("Q3 Review Revenue grew 18%.");
  });

  it("leaves out script and style, which are never on screen", () => {
    const index = render(
      `<p>Visible</p><script>const hidden = 1;</script><style>p{color:red}</style>`,
    );

    expect(index.text).toBe("Visible");
  });

  it("leaves out our own overlay so marks cannot anchor to marks", () => {
    const index = render(
      `<p>Artifact copy</p><div ${OVERLAY_HOST_ATTRIBUTE}><span>Coedit chrome</span></div>`,
    );

    expect(index.text).toBe("Artifact copy");
  });

  it("indexes an empty document without inventing text", () => {
    expect(render("").text).toBe("");
  });
});

describe("offsetsForRange", () => {
  it("finds the offsets of a selection inside one text node", () => {
    const index = render(`<p>Revenue grew 18% this quarter.</p>`);
    const node = textNodeIn("p");

    const range = document.createRange();
    range.setStart(node, 8);
    range.setEnd(node, 16);

    expect(selectedText(index, range)).toBe("grew 18%");
  });

  it("finds the offsets of a selection spanning two elements", () => {
    const index = render(`<p>Revenue grew.</p><p>Churn held flat.</p>`);

    const range = document.createRange();
    range.setStart(textNodeIn("p:first-of-type"), 8);
    range.setEnd(textNodeIn("p:last-of-type"), 5);

    expect(selectedText(index, range)).toBe("grew. Churn");
  });

  it("refuses a collapsed selection, which anchors nothing", () => {
    const index = render(`<p>Revenue grew.</p>`);
    const range = document.createRange();
    range.setStart(textNodeIn("p"), 4);
    range.collapse(true);

    expect(offsetsForRange(index, range)).toBeNull();
  });
});

describe("rangeForOffsets", () => {
  it("round-trips a selection back to the same words", () => {
    const index = render(`<p>Revenue   grew 18%</p><p>Churn held flat</p>`);

    expect(rangeFor(index, "grew 18%").toString()).toBe("grew 18%");
  });

  // The separating space is ours, so the DOM range across the two cannot hold it.
  it("spans elements, landing on the same offsets it came from", () => {
    const index = render(`<p>Revenue grew.</p><p>Churn held flat.</p>`);
    const quote = "grew. Churn";
    const start = index.text.indexOf(quote);

    const range = rangeFor(index, quote);

    expect(range.toString()).toBe("grew.Churn");
    expect(offsetsForRange(index, range)).toEqual({
      start,
      end: start + quote.length,
    });
  });
});
