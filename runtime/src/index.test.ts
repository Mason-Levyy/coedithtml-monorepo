import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OVERLAY_HOST_ATTRIBUTE } from "./dom/constants";
import { start } from "./index";

function overlayHosts(): Element[] {
  return Array.from(document.querySelectorAll(`[${OVERLAY_HOST_ATTRIBUTE}]`));
}

function artifactMarkup(): string {
  const clone = document.body.cloneNode(true) as HTMLElement;
  for (const host of Array.from(
    clone.querySelectorAll(`[${OVERLAY_HOST_ATTRIBUTE}]`),
  )) {
    host.remove();
  }
  return clone.innerHTML;
}

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
    const before = artifactMarkup();

    start();

    expect(artifactMarkup()).toBe(before);
  });

  it("adds one host for its UI and nothing else", () => {
    vi.stubGlobal("parent", { postMessage: vi.fn() });

    start();

    const hosts = overlayHosts();
    expect(hosts).toHaveLength(1);
    expect(hosts[0]?.parentElement).toBe(document.body);
  });

  // Everything we draw lives in a closed shadow root the artifact cannot reach.
  it("keeps the host empty and untouchable in the light DOM", () => {
    vi.stubGlobal("parent", { postMessage: vi.fn() });

    start();

    const host = overlayHosts()[0];
    expect(host?.innerHTML).toBe("");
    expect(host?.shadowRoot).toBeNull();
    expect(host?.getAttribute("style")).toContain("pointer-events:none");
  });

  it("does not throw when the bridge is dead", () => {
    vi.stubGlobal("parent", {
      postMessage: () => {
        throw new Error("bridge is dead");
      },
    });
    const before = artifactMarkup();

    expect(() => start()).not.toThrow();
    expect(artifactMarkup()).toBe(before);
  });
});
