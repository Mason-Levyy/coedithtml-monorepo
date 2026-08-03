import { describe, expect, it } from "vitest";
import type { Slide } from "../segmentation/types";
import { determineActiveSlide, watchScrollSpy } from "./scroll-spy";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function child(container: Element, index: number): HTMLElement {
  const element = container.children[index];
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing child at index ${index}`);
  }
  return element;
}

function withTop(container: Element, index: number, top: number): void {
  child(container, index).getBoundingClientRect = () =>
    ({ top }) as unknown as DOMRect;
}

function containerWithSlides(count: number): {
  container: Element;
  slides: Slide[];
} {
  const container = document.createElement("div");
  const slides: Slide[] = [];
  for (let i = 0; i < count; i += 1) {
    container.appendChild(document.createElement("div"));
    slides.push({ index: i, startChild: i, endChild: i, label: `Slide ${i}` });
  }
  return { container, slides };
}

describe("determineActiveSlide", () => {
  it("picks the last slide whose start has scrolled past the threshold", () => {
    const { container, slides } = containerWithSlides(3);
    withTop(container, 0, -500);
    withTop(container, 1, -10);
    withTop(container, 2, 800);

    expect(determineActiveSlide(container, slides)).toBe(1);
  });

  it("defaults to the first slide when nothing has scrolled past yet", () => {
    const { container, slides } = containerWithSlides(3);
    withTop(container, 0, 100);
    withTop(container, 1, 900);
    withTop(container, 2, 1800);

    expect(determineActiveSlide(container, slides)).toBe(0);
  });

  it("picks the final slide once everything has scrolled past", () => {
    const { container, slides } = containerWithSlides(3);
    withTop(container, 0, -900);
    withTop(container, 1, -500);
    withTop(container, 2, -10);

    expect(determineActiveSlide(container, slides)).toBe(2);
  });
});

describe("watchScrollSpy", () => {
  it("reports the initial active slide immediately", () => {
    const { container, slides } = containerWithSlides(2);
    withTop(container, 0, 0);
    withTop(container, 1, 900);

    const reports: number[] = [];
    const watcher = watchScrollSpy(
      container,
      () => slides,
      (index) => reports.push(index),
    );

    expect(reports).toEqual([0]);
    watcher.disconnect();
  });

  it("reports again, throttled, after a scroll event changes the active slide", async () => {
    const { container, slides } = containerWithSlides(2);
    withTop(container, 0, 0);
    withTop(container, 1, 900);

    const reports: number[] = [];
    const watcher = watchScrollSpy(
      container,
      () => slides,
      (index) => reports.push(index),
      20,
    );

    withTop(container, 1, -10);
    window.dispatchEvent(new Event("scroll"));

    await sleep(40);
    expect(reports).toEqual([0, 1]);
    watcher.disconnect();
  });

  it("does not report duplicate values for the same active slide", async () => {
    const { container, slides } = containerWithSlides(2);
    withTop(container, 0, 0);
    withTop(container, 1, 900);

    const reports: number[] = [];
    const watcher = watchScrollSpy(
      container,
      () => slides,
      (index) => reports.push(index),
      10,
    );

    window.dispatchEvent(new Event("scroll"));
    await sleep(20);
    window.dispatchEvent(new Event("scroll"));
    await sleep(20);

    expect(reports).toEqual([0]);
    watcher.disconnect();
  });

  it("stops reporting after disconnect", async () => {
    const { container, slides } = containerWithSlides(2);
    withTop(container, 0, 0);
    withTop(container, 1, 900);

    const reports: number[] = [];
    const watcher = watchScrollSpy(
      container,
      () => slides,
      (index) => reports.push(index),
      10,
    );
    watcher.disconnect();

    withTop(container, 1, -10);
    window.dispatchEvent(new Event("scroll"));
    await sleep(30);

    expect(reports).toEqual([0]);
  });
});
