import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as SegmentModule from "./segmentation/segment";

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
    window.__coedit__ = {
      version: "test",
      config: { appOrigin: "https://app.example.com" },
    };
  });

  afterEach(() => {
    delete window.__coedit__;
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

  it("keeps watching for resegmentation even when the initial segmentation call throws", async () => {
    const postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });

    vi.doMock("./segmentation/segment", async () => {
      const actual = await vi.importActual<typeof SegmentModule>(
        "./segmentation/segment",
      );
      let calls = 0;
      return {
        ...actual,
        segmentWithProfile: (container: Element) => {
          calls += 1;
          if (calls === 1) {
            throw new Error("segmentation exploded");
          }
          return actual.segmentWithProfile(container);
        },
      };
    });

    const { start } = await import("./index");
    const startPromise = start();
    await vi.advanceTimersByTimeAsync(1000);
    await startPromise;

    const main = document.querySelector("main");
    if (main === null) {
      throw new Error("expected a container");
    }
    const third = document.createElement("section");
    third.innerHTML = "<h1>Third</h1>";
    main.appendChild(third);
    await vi.advanceTimersByTimeAsync(1000);

    vi.doUnmock("./segmentation/segment");

    const resegmentedCall = postMessage.mock.calls.find(
      ([message]) =>
        typeof message === "object" &&
        message !== null &&
        (message as { type?: unknown }).type === "resegmented",
    );
    expect(resegmentedCall).toBeDefined();
  });

  // The watcher used to segment and pass the result to its callback, so a
  // throw happened inside its timer rather than inside start()'s try/catch
  // and escaped as an unhandled page error.
  it("survives a segmentation throw during resegmentation, not just the first call", async () => {
    const postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });
    const control = { throwNow: false };

    vi.doMock("./segmentation/segment", async () => {
      const actual = await vi.importActual<typeof SegmentModule>(
        "./segmentation/segment",
      );
      return {
        ...actual,
        segmentWithProfile: (container: Element) => {
          if (control.throwNow) {
            throw new Error("segmentation exploded in the watcher");
          }
          return actual.segmentWithProfile(container);
        },
      };
    });

    const { start } = await import("./index");
    const startPromise = start();
    await vi.advanceTimersByTimeAsync(1000);
    await startPromise;

    const main = document.querySelector("main");
    if (main === null) {
      throw new Error("expected a container");
    }
    control.throwNow = true;
    const third = document.createElement("section");
    third.innerHTML = "<h1>Third</h1>";
    main.appendChild(third);

    let escaped: unknown = null;
    try {
      await vi.advanceTimersByTimeAsync(1000);
    } catch (error) {
      escaped = error;
    }

    control.throwNow = false;
    const fourth = document.createElement("section");
    fourth.innerHTML = "<h1>Fourth</h1>";
    main.appendChild(fourth);
    await vi.advanceTimersByTimeAsync(1000);

    vi.doUnmock("./segmentation/segment");

    expect(escaped).toBeNull();
    const resegmented = postMessage.mock.calls.filter(
      ([message]) =>
        typeof message === "object" &&
        message !== null &&
        (message as { type?: unknown }).type === "resegmented",
    );
    expect(resegmented.length).toBeGreaterThan(0);
  });

  // Nothing scrolls when a slide is staged, so without this the filmstrip
  // highlight and the "N of M" counter freeze on whatever was showing before.
  it("reports the staged slide as active, since staging does not scroll", async () => {
    const postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });

    const { start } = await import("./index");
    const startPromise = start();
    await vi.advanceTimersByTimeAsync(1000);
    await startPromise;
    postMessage.mockClear();

    dispatchAppCommand({ version: 1, type: "setStageSlide", index: 1 });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "activeSlide", index: 1 }),
      "https://app.example.com",
    );
  });

  it("keeps a staged document staged when new children appear", async () => {
    vi.stubGlobal("parent", { postMessage: vi.fn() });

    const { start } = await import("./index");
    const startPromise = start();
    await vi.advanceTimersByTimeAsync(1000);
    await startPromise;

    dispatchAppCommand({ version: 1, type: "setStageSlide", index: 1 });

    const main = document.querySelector("main");
    if (main === null) throw new Error("expected a container");
    const third = document.createElement("section");
    third.innerHTML = "<h1>Third</h1>";
    main.appendChild(third);
    await vi.advanceTimersByTimeAsync(1000);

    const sections = [...document.querySelectorAll("main > section")];
    const visible = sections.filter(
      (section) =>
        section instanceof HTMLElement && section.style.display !== "none",
    );
    expect(visible).toHaveLength(1);
  });

  // A display:none element reports a zero-height rect, which the scroll-spy
  // would otherwise read as "scrolled past" and report the last slide.
  it("does not let the scroll-spy contradict the staged slide", async () => {
    const postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });

    const { start } = await import("./index");
    const startPromise = start();
    await vi.advanceTimersByTimeAsync(1000);
    await startPromise;

    dispatchAppCommand({ version: 1, type: "setStageSlide", index: 0 });
    postMessage.mockClear();

    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(1000);

    const activeReports = postMessage.mock.calls.filter(
      ([message]) =>
        typeof message === "object" &&
        message !== null &&
        (message as { type?: unknown }).type === "activeSlide",
    );
    expect(activeReports).toHaveLength(0);
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
