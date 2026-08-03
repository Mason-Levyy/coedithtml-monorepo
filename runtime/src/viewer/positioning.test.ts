import { describe, expect, it } from "vitest";
import { hasStickyOrFixedPositioning } from "./positioning";

function containerFromHtml(html: string): Element {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe("hasStickyOrFixedPositioning", () => {
  it("detects a fixed header set via a stylesheet rule", () => {
    const container = containerFromHtml(
      '<style>.header { position: fixed; }</style><div class="header">Nav</div><p>Body</p>',
    );

    expect(hasStickyOrFixedPositioning(container)).toBe(true);
  });

  it("detects a sticky element set via an inline style", () => {
    const container = containerFromHtml(
      '<div style="position: sticky;">Nav</div><p>Body</p>',
    );

    expect(hasStickyOrFixedPositioning(container)).toBe(true);
  });

  it("detects positioning on a deeply nested descendant", () => {
    const container = containerFromHtml(
      '<div><section><span style="position: fixed;">Badge</span></section></div>',
    );

    expect(hasStickyOrFixedPositioning(container)).toBe(true);
  });

  it("detects positioning on the container itself", () => {
    const container = document.createElement("div");
    container.style.position = "sticky";
    document.body.appendChild(container);

    expect(hasStickyOrFixedPositioning(container)).toBe(true);
  });

  it("returns false when nothing uses sticky or fixed positioning", () => {
    const container = containerFromHtml(
      '<div style="position: relative;">Nav</div><p>Body</p>',
    );

    expect(hasStickyOrFixedPositioning(container)).toBe(false);
  });

  it("returns false for a container with no descendants at all", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    expect(hasStickyOrFixedPositioning(container)).toBe(false);
  });
});
