import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportFit } from "./fit";

function stubScrollHeight(pixels: number): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    get: () => pixels,
  });
}

function sentMessages(postMessage: ReturnType<typeof vi.fn>): unknown[] {
  return postMessage.mock.calls.map((call) => call[0]);
}

describe("reportFit", () => {
  let postMessage: ReturnType<typeof vi.fn>;
  let stopReporting: (() => void)[];

  function startReporting(): () => void {
    const stop = reportFit();
    stopReporting.push(stop);
    return stop;
  }

  beforeEach(() => {
    stopReporting = [];
    postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    window.__coedit__ = {
      version: "test",
      config: { appOrigin: "https://app.example.com" },
    };
    document.body.innerHTML = "<p>artifact</p>";
    document.body.style.overflowY = "";
    document.documentElement.style.overflowY = "";
  });

  afterEach(() => {
    stopReporting.forEach((stop) => stop());
    delete window.__coedit__;
    vi.unstubAllGlobals();
  });

  it("reports a plain document as one that grows to its content", () => {
    stubScrollHeight(4200);

    startReporting();

    expect(sentMessages(postMessage)).toEqual([
      {
        version: 1,
        type: "fit",
        mode: "grows-to-content",
        contentHeight: 4200,
      },
    ]);
  });

  // Overflow hidden means the artifact drives its own viewport; not a grow target.
  it("reports an artifact that hides its overflow as scrolling itself", () => {
    document.body.style.overflowY = "hidden";
    stubScrollHeight(900);

    startReporting();

    expect(sentMessages(postMessage)).toEqual([
      { version: 1, type: "fit", mode: "scrolls-itself", contentHeight: 900 },
    ]);
  });

  // A frame sized to zero measures its own content as zero forever after.
  it("says nothing when the document has not laid out yet", () => {
    stubScrollHeight(0);

    startReporting();

    expect(postMessage).not.toHaveBeenCalled();
  });

  // Deduping alone would leave a late listener with nothing, forever.
  it("repeats an unchanged height on load", () => {
    stubScrollHeight(1200);

    startReporting();
    postMessage.mockClear();
    window.dispatchEvent(new Event("load"));

    expect(sentMessages(postMessage)).toEqual([
      {
        version: 1,
        type: "fit",
        mode: "grows-to-content",
        contentHeight: 1200,
      },
    ]);
  });

  it("stops observing when torn down", () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        disconnect(): void {
          disconnect();
        }
      },
    );
    stubScrollHeight(500);

    startReporting()();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
