import { describe, expect, it, vi } from "vitest";
import type { Slide } from "../segmentation/types";
import { scrollToSlide } from "./navigate";

const SLIDES: Slide[] = [
  { index: 0, startChild: 0, endChild: 1, label: "One" },
  { index: 1, startChild: 2, endChild: 2, label: "Two" },
];

function containerWithChildren(count: number): HTMLElement {
  const container = document.createElement("div");
  for (let i = 0; i < count; i += 1) {
    container.appendChild(document.createElement("div"));
  }
  return container;
}

describe("scrollToSlide", () => {
  it("scrolls the slide's first child into view", () => {
    const container = containerWithChildren(3);
    const target = container.children[2];
    const scrollIntoView = vi.fn();
    if (target instanceof HTMLElement) {
      target.scrollIntoView = scrollIntoView;
    }

    scrollToSlide(container, SLIDES, 1);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("does nothing for an unknown slide index", () => {
    const container = containerWithChildren(3);
    const calls: unknown[] = [];
    [...container.children].forEach((child) => {
      if (child instanceof HTMLElement) {
        child.scrollIntoView = () => calls.push(child);
      }
    });

    scrollToSlide(container, SLIDES, 99);

    expect(calls).toHaveLength(0);
  });
});
