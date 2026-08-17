import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRepaintScheduler } from "./scheduler";

describe("the repaint scheduler", () => {
  let frames: FrameRequestCallback[] = [];

  function flushFrames(): void {
    const pending = [...frames];
    frames = [];
    pending.forEach((cb) => cb(performance.now()));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
      frames = [];
    });
    document.body.innerHTML =
      '<div id="app"><section id="tab1">Content</section></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("repaints on requestAnimationFrame", () => {
    const onPaint = vi.fn();
    const onReindex = vi.fn();
    const scheduler = createRepaintScheduler({ onPaint, onReindex });

    scheduler.repaint();
    expect(onPaint).not.toHaveBeenCalled();

    flushFrames();
    expect(onPaint).toHaveBeenCalledTimes(1);
    expect(onReindex).not.toHaveBeenCalled();

    scheduler.stop();
  });

  it("reindexes before painting when requested", () => {
    const order: string[] = [];
    const scheduler = createRepaintScheduler({
      onPaint: () => order.push("paint"),
      onReindex: () => order.push("reindex"),
    });

    scheduler.reindex();
    flushFrames();

    expect(order).toEqual(["reindex", "paint"]);
    scheduler.stop();
  });

  it("repaints immediately on class or style attribute mutations", async () => {
    const onPaint = vi.fn();
    const onReindex = vi.fn();
    const scheduler = createRepaintScheduler({ onPaint, onReindex });

    const section = document.getElementById("tab1");
    section?.classList.add("hidden");

    await Promise.resolve();

    flushFrames();
    expect(onPaint).toHaveBeenCalledTimes(1);
    expect(onReindex).not.toHaveBeenCalled();

    scheduler.stop();
  });

  it("debounces reindex on structural childList DOM mutations", async () => {
    const onPaint = vi.fn();
    const onReindex = vi.fn();
    const scheduler = createRepaintScheduler({ onPaint, onReindex });

    const app = document.getElementById("app");
    const newEl = document.createElement("p");
    newEl.textContent = "New element";
    app?.appendChild(newEl);

    await Promise.resolve();

    flushFrames();
    expect(onReindex).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    flushFrames();
    expect(onReindex).toHaveBeenCalledTimes(1);
    expect(onPaint).toHaveBeenCalledTimes(1);

    scheduler.stop();
  });

  it("holds index rebuild until holdIndex is cleared", () => {
    const onPaint = vi.fn();
    const onReindex = vi.fn();
    const scheduler = createRepaintScheduler({ onPaint, onReindex });

    scheduler.holdIndex(true);
    scheduler.reindex();

    flushFrames();
    expect(onPaint).toHaveBeenCalledTimes(1);
    expect(onReindex).not.toHaveBeenCalled();

    scheduler.holdIndex(false);
    flushFrames();
    expect(onReindex).toHaveBeenCalledTimes(1);

    scheduler.stop();
  });

  it("repaints on window scroll and resize", () => {
    const onPaint = vi.fn();
    const onReindex = vi.fn();
    const scheduler = createRepaintScheduler({ onPaint, onReindex });

    window.dispatchEvent(new Event("scroll"));
    flushFrames();
    expect(onPaint).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("resize"));
    flushFrames();
    expect(onPaint).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });
});
