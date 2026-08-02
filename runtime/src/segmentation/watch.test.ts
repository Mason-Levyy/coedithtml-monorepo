import { describe, expect, it } from "vitest";
import type { SegmentResult } from "./types";
import { watchForResegmentation } from "./watch";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("watchForResegmentation", () => {
  it("re-segments after a structural change, once mutations go quiet", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<section><h1>One</h1></section>";
    document.body.appendChild(container);

    const results: SegmentResult[] = [];
    const watcher = watchForResegmentation(
      container,
      (result) => results.push(result),
      20,
    );

    const section = document.createElement("section");
    section.innerHTML = "<h1>Two</h1>";
    container.appendChild(section);

    await sleep(50);
    expect(results).toHaveLength(1);
    expect(results[0]?.slides.map((slide) => slide.label)).toEqual([
      "One",
      "Two",
    ]);

    watcher.disconnect();
  });

  it("debounces rapid successive structural changes into one re-segmentation", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<section><h1>One</h1></section>";
    document.body.appendChild(container);

    const results: SegmentResult[] = [];
    const watcher = watchForResegmentation(
      container,
      (result) => results.push(result),
      30,
    );

    for (let i = 0; i < 5; i += 1) {
      const section = document.createElement("section");
      section.innerHTML = `<h1>Extra ${i}</h1>`;
      container.appendChild(section);
      await sleep(10);
    }

    await sleep(60);
    expect(results).toHaveLength(1);
    expect(results[0]?.slides).toHaveLength(6);

    watcher.disconnect();
  });

  it("does not re-segment on text-only mutations", async () => {
    const container = document.createElement("div");
    container.innerHTML =
      "<section><h1>One</h1></section><section><h1>Two</h1></section>";
    document.body.appendChild(container);

    const results: SegmentResult[] = [];
    const watcher = watchForResegmentation(
      container,
      (result) => results.push(result),
      20,
    );

    const heading = container.querySelector("h1");
    if (heading) {
      heading.textContent = "Changed";
    }

    await sleep(50);
    expect(results).toHaveLength(0);

    watcher.disconnect();
  });

  it("stops calling back after disconnect", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<section><h1>One</h1></section>";
    document.body.appendChild(container);

    const results: SegmentResult[] = [];
    const watcher = watchForResegmentation(
      container,
      (result) => results.push(result),
      20,
    );
    watcher.disconnect();

    const section = document.createElement("section");
    section.innerHTML = "<h1>Two</h1>";
    container.appendChild(section);

    await sleep(50);
    expect(results).toHaveLength(0);
  });
});
