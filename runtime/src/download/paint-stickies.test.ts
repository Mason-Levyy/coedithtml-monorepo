import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StickyEntry } from "@coedithtml/protocol";
import { paintStickies } from "./paint-stickies";

const REGION = {
  kind: "region" as const,
  path: "p[1]",
  fractionX: 0.5,
  fractionY: 0.5,
  revision: "r1",
};

function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
  return {
    kind: "sticky",
    id: "s1",
    parentId: null,
    anchor: REGION,
    body: "Swap this chart",
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    tail: null,
    ...overrides,
  };
}

describe("paintStickies", () => {
  beforeEach(() => {
    document.body.innerHTML = "<p>Revenue grew 18% this quarter.</p>";
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: 200,
      height: 100,
      right: 300,
      bottom: 150,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
  });

  it("does nothing when there are no stickies", () => {
    expect(paintStickies([])).toBeNull();
    expect(document.querySelector("[data-coedit-overlay]")).toBeNull();
  });

  it("hosts the painted stickies in a closed shadow root off the artifact's own DOM", () => {
    paintStickies([sticky()]);

    const host = document.querySelector("[data-coedit-overlay]");
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).toBeNull();
  });

  it("paints a sticky's body and author", () => {
    const surface = paintStickies([sticky()]);

    const painted = surface?.querySelector(".sticky");
    expect(painted?.textContent).toContain("Swap this chart");
    expect(painted?.textContent).toContain("Sam");
  });

  it("positions the sticky at its anchored region plus its offset", () => {
    const surface = paintStickies([sticky({ offsetX: 40, offsetY: 10 })]);

    const painted = surface?.querySelector<HTMLElement>(".sticky");
    expect(painted?.style.left).toBe("240px");
    expect(painted?.style.top).toBe("110px");
  });

  it("repaints position on scroll without duplicating the element", () => {
    const surface = paintStickies([sticky()]);
    const before = surface?.querySelectorAll(".sticky").length;

    window.dispatchEvent(new Event("scroll"));

    expect(surface?.querySelectorAll(".sticky").length).toBe(before);
  });

  it("skips a sticky whose anchored element is gone", () => {
    const surface = paintStickies([
      sticky({ anchor: { ...REGION, path: "missing[1]" } }),
    ]);

    expect(surface?.querySelectorAll(".sticky").length).toBe(0);
  });
});
