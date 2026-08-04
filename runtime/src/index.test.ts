import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "./index";

describe("start", () => {
  beforeEach(() => {
    document.title = "Q3 Review";
    document.body.innerHTML = `<div class="bar">chrome</div><div id="stage"><section class="slide on">Slide</section></div>`;
    window.__coedit__ = {
      version: "test",
      config: { appOrigin: "https://app.example.com" },
    };
  });

  afterEach(() => {
    delete window.__coedit__;
    vi.unstubAllGlobals();
  });

  it("reports the document title to the chrome", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });

    start();

    expect(postMessage).toHaveBeenCalledWith(
      { version: 1, type: "ready", title: "Q3 Review" },
      "https://app.example.com",
    );
  });

  // Artifact markup is third-party; injection must be invisible to it.
  it("leaves the artifact's own markup untouched", () => {
    vi.stubGlobal("parent", { postMessage: vi.fn() });
    const before = document.body.innerHTML;

    start();

    expect(document.body.innerHTML).toBe(before);
  });

  it("does not throw when the bridge is dead", () => {
    vi.stubGlobal("parent", {
      postMessage: () => {
        throw new Error("bridge is dead");
      },
    });
    const before = document.body.innerHTML;

    expect(() => start()).not.toThrow();
    expect(document.body.innerHTML).toBe(before);
  });
});
