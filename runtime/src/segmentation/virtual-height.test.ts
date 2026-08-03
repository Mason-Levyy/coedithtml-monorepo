import { describe, expect, it } from "vitest";
import { estimateVirtualHeight } from "./virtual-height";

function element(html: string): Element {
  const host = document.createElement("div");
  host.innerHTML = html;
  const child = host.firstElementChild;
  if (child === null) throw new Error("expected an element");
  return child;
}

describe("estimateVirtualHeight", () => {
  it("grows with the amount of text", () => {
    const short = estimateVirtualHeight(element("<p>Hi.</p>"));
    const long = estimateVirtualHeight(
      element(`<p>${"word ".repeat(400)}</p>`),
    );

    expect(long).toBeGreaterThan(short);
  });

  it("gives a heading more height per line than body copy", () => {
    const heading = estimateVirtualHeight(element("<h1>Title</h1>"));
    const paragraph = estimateVirtualHeight(element("<p>Title</p>"));

    expect(heading).toBeGreaterThan(paragraph);
  });

  it("counts a block's text once, not once per ancestor", () => {
    const nested = estimateVirtualHeight(
      element("<div><div><p>Some copy here.</p></div></div>"),
    );
    const flat = estimateVirtualHeight(element("<p>Some copy here.</p>"));

    expect(nested).toBe(flat);
  });

  it("adds each sibling block rather than collapsing them", () => {
    const one = estimateVirtualHeight(element("<div><p>Alpha.</p></div>"));
    const three = estimateVirtualHeight(
      element("<div><p>Alpha.</p><p>Beta.</p><p>Gamma.</p></div>"),
    );

    expect(three).toBeGreaterThan(one * 2);
  });

  it("uses a declared media height when there is one", () => {
    const tall = estimateVirtualHeight(
      element('<figure><img height="600"></figure>'),
    );
    const short = estimateVirtualHeight(
      element('<figure><img height="100"></figure>'),
    );

    expect(tall - short).toBe(500);
  });

  it("falls back to a default height for media with no declared size", () => {
    const withMedia = estimateVirtualHeight(element("<figure><img></figure>"));
    const withoutMedia = estimateVirtualHeight(element("<figure></figure>"));

    expect(withMedia).toBeGreaterThan(withoutMedia);
  });

  // The whole point of the estimator: it reads the DOM, never the layout, so
  // the viewport it happens to be measured in cannot change the answer.
  it("does not consult getBoundingClientRect", () => {
    const node = element("<p>Some reasonably long paragraph of copy.</p>");
    let measured = false;
    node.getBoundingClientRect = () => {
      measured = true;
      return { height: 999 } as unknown as DOMRect;
    };

    estimateVirtualHeight(node);

    expect(measured).toBe(false);
  });
});
