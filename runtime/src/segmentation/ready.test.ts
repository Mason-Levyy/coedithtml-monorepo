import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitUntilReady } from "./ready";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("waitUntilReady", () => {
  let originalReadyState: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalReadyState = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "readyState",
    );
  });

  afterEach(() => {
    if (originalReadyState) {
      Object.defineProperty(document, "readyState", originalReadyState);
    }
  });

  function setReadyState(value: DocumentReadyState) {
    Object.defineProperty(document, "readyState", {
      value,
      configurable: true,
    });
  }

  it("does not resolve before the load event fires", async () => {
    setReadyState("loading");
    const container = document.createElement("div");
    document.body.appendChild(container);

    let resolved = false;
    void waitUntilReady(container, { quietMs: 10, maxWaitMs: 1000 }).then(
      () => {
        resolved = true;
      },
    );

    await sleep(30);
    expect(resolved).toBe(false);

    setReadyState("complete");
    window.dispatchEvent(new Event("load"));
    await sleep(30);
    expect(resolved).toBe(true);
  });

  it("resolves immediately after load when the DOM is already quiet", async () => {
    setReadyState("complete");
    const container = document.createElement("div");
    document.body.appendChild(container);

    await waitUntilReady(container, { quietMs: 10, maxWaitMs: 1000 });
  });

  it("resets the quiet window on every mutation", async () => {
    setReadyState("complete");
    const container = document.createElement("div");
    document.body.appendChild(container);

    let resolved = false;
    void waitUntilReady(container, { quietMs: 40, maxWaitMs: 2000 }).then(
      () => {
        resolved = true;
      },
    );

    await sleep(20);
    container.appendChild(document.createElement("span"));
    await sleep(20);
    expect(resolved).toBe(false);

    await sleep(30);
    expect(resolved).toBe(true);
  });

  it("gives up once maxWaitMs is reached, even mid-mutation", async () => {
    setReadyState("complete");
    const container = document.createElement("div");
    document.body.appendChild(container);

    let resolved = false;
    void waitUntilReady(container, { quietMs: 50, maxWaitMs: 80 }).then(() => {
      resolved = true;
    });

    const interval = setInterval(() => {
      container.appendChild(document.createElement("span"));
    }, 20);

    await sleep(120);
    clearInterval(interval);
    expect(resolved).toBe(true);
  });
});
