import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function dispatchAppCommand(data: unknown): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: "https://app.example.com",
      data,
    }),
  );
}

describe("runtime fail-open behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <main>
        <section><h1>First</h1><p>Alpha content.</p></section>
        <section><h1>Second</h1><p>Beta content.</p></section>
      </main>
    `;
    window.__coedit_config__ = { appOrigin: "https://app.example.com" };
  });

  afterEach(() => {
    delete window.__coedit_config__;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.resetModules();
  });

  it("leaves the artifact's own markup untouched when every bridge send throws", async () => {
    vi.stubGlobal("parent", {
      postMessage: () => {
        throw new Error("bridge is dead");
      },
    });
    const originalBody = document.body.innerHTML;

    const { start } = await import("./index");
    const startPromise = start();
    await vi.advanceTimersByTimeAsync(1000);
    await startPromise;

    expect(document.body.innerHTML).toBe(originalBody);
  });

  it("keeps applying viewer commands even though the initial ready send failed", async () => {
    vi.stubGlobal("parent", {
      postMessage: () => {
        throw new Error("bridge is dead");
      },
    });

    const { start } = await import("./index");
    const startPromise = start();
    await vi.advanceTimersByTimeAsync(1000);
    await startPromise;

    const sections = document.querySelectorAll("main > section");
    const first = sections[0];
    const second = sections[1];
    if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) {
      throw new Error("expected two section elements");
    }

    dispatchAppCommand({ version: 1, type: "setStageSlide", index: 1 });

    expect(first.style.display).toBe("none");
    expect(second.style.display).not.toBe("none");
  });

  it("resolves via the max-wait cap instead of hanging forever on a page that keeps mutating", async () => {
    vi.stubGlobal("parent", { postMessage: vi.fn() });
    const container = document.querySelector("main");
    if (container === null) {
      throw new Error("expected a container");
    }

    const mutator = setInterval(() => {
      container.setAttribute("data-tick", String(Date.now()));
    }, 100);

    const { start } = await import("./index");
    const startPromise = start().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(6000);
    clearInterval(mutator);
    const result = await startPromise;

    expect(result).toBeUndefined();
  });
});
