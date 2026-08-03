import { describe, expect, it } from "vitest";
import { watchForStructuralChange } from "./watch";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function containerWith(html: string): Element {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

function appendSection(container: Element, heading: string): void {
  const section = document.createElement("section");
  section.innerHTML = `<h1>${heading}</h1>`;
  container.appendChild(section);
}

describe("watchForStructuralChange", () => {
  it("reports a structural change once mutations go quiet", async () => {
    const container = containerWith("<section><h1>One</h1></section>");
    let changes = 0;
    const watcher = watchForStructuralChange(
      container,
      () => (changes += 1),
      20,
    );

    appendSection(container, "Two");

    await sleep(50);
    expect(changes).toBe(1);

    watcher.disconnect();
  });

  it("debounces rapid successive structural changes into one report", async () => {
    const container = containerWith("<section><h1>One</h1></section>");
    let changes = 0;
    const watcher = watchForStructuralChange(
      container,
      () => (changes += 1),
      30,
    );

    for (let i = 0; i < 5; i += 1) {
      appendSection(container, `Extra ${i}`);
      await sleep(10);
    }

    await sleep(60);
    expect(changes).toBe(1);

    watcher.disconnect();
  });

  it("does not report text-only mutations", async () => {
    const container = containerWith(
      "<section><h1>One</h1></section><section><h1>Two</h1></section>",
    );
    let changes = 0;
    const watcher = watchForStructuralChange(
      container,
      () => (changes += 1),
      20,
    );

    const heading = container.querySelector("h1");
    if (heading) {
      heading.textContent = "Changed";
    }

    await sleep(50);
    expect(changes).toBe(0);

    watcher.disconnect();
  });

  it("stops calling back after disconnect", async () => {
    const container = containerWith("<section><h1>One</h1></section>");
    let changes = 0;
    const watcher = watchForStructuralChange(
      container,
      () => (changes += 1),
      20,
    );
    watcher.disconnect();

    appendSection(container, "Two");

    await sleep(50);
    expect(changes).toBe(0);
  });

  // The watcher used to segment and hand the result to its callback, which put
  // the strategies inside this timer, outside the caller's error handling.
  it("lets the caller decide what running the strategies costs", async () => {
    const container = containerWith("<section><h1>One</h1></section>");
    let escaped: unknown = null;
    const watcher = watchForStructuralChange(
      container,
      () => {
        try {
          throw new Error("caller's own failure");
        } catch {
          escaped = null;
        }
      },
      20,
    );

    appendSection(container, "Two");
    await sleep(50);

    expect(escaped).toBeNull();
    watcher.disconnect();
  });
});
