import { describe, expect, it } from "vitest";
import type { Slide } from "../segmentation/types";
import { createStageController } from "./stage";

function containerWithChildren(count: number): {
  container: HTMLElement;
  children: HTMLElement[];
} {
  const container = document.createElement("div");
  const children: HTMLElement[] = [];
  for (let i = 0; i < count; i += 1) {
    const child = document.createElement("div");
    child.textContent = `Child ${i}`;
    container.appendChild(child);
    children.push(child);
  }
  return { container, children };
}

const SLIDES: Slide[] = [
  { index: 0, startChild: 0, endChild: 1, label: "One" },
  { index: 1, startChild: 2, endChild: 3, label: "Two" },
];

describe("createStageController", () => {
  it("hides every child outside the active slide's range", () => {
    const { container, children } = containerWithChildren(4);
    const stage = createStageController(container);

    stage.setActiveSlide(SLIDES, 1);

    expect(children[0]?.style.display).toBe("none");
    expect(children[1]?.style.display).toBe("none");
    expect(children[2]?.style.display).not.toBe("none");
    expect(children[3]?.style.display).not.toBe("none");
  });

  it("restores every child's original inline display when exiting stage mode", () => {
    const { container, children } = containerWithChildren(4);
    const first = children[0];
    if (first) {
      first.style.display = "flex";
    }
    const stage = createStageController(container);

    stage.setActiveSlide(SLIDES, 1);
    stage.setActiveSlide(SLIDES, null);

    expect(children[0]?.style.display).toBe("flex");
    expect(children[1]?.style.display).toBe("");
    expect(children[2]?.style.display).toBe("");
    expect(children[3]?.style.display).toBe("");
  });

  it("switches the active slide, restoring the previous one and hiding the new inactive set", () => {
    const { container, children } = containerWithChildren(4);
    const stage = createStageController(container);

    stage.setActiveSlide(SLIDES, 0);
    stage.setActiveSlide(SLIDES, 1);

    expect(children[0]?.style.display).toBe("none");
    expect(children[1]?.style.display).toBe("none");
    expect(children[2]?.style.display).not.toBe("none");
    expect(children[3]?.style.display).not.toBe("none");
  });

  it("fails open to showing everything for an unrecognized slide index", () => {
    const { container, children } = containerWithChildren(4);
    const stage = createStageController(container);

    stage.setActiveSlide(SLIDES, 99);

    children.forEach((child) => {
      expect(child.style.display).not.toBe("none");
    });
  });
});
