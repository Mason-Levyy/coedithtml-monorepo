import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useArtifactBridge } from "./useArtifactBridge";

const SANDBOX_ORIGIN = "https://sandbox.example.com";

function dispatchMessage(origin: string, data: unknown): void {
  window.dispatchEvent(new MessageEvent("message", { origin, data }));
}

function readyMessage(slideCount: number) {
  return {
    version: 1,
    type: "ready",
    slides: Array.from({ length: slideCount }, (_, i) => ({
      index: i,
      startChild: i,
      endChild: i,
      label: `Slide ${i}`,
    })),
    profile: "slides",
    hasStickyOrFixed: false,
  };
}

describe("useArtifactBridge", () => {
  it("starts in the loading state", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    expect(result.current.state).toEqual({ status: "loading" });
  });

  it("becomes ready with activeSlideIndex 0 on a ready message", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, readyMessage(3));
    });

    expect(result.current.state).toMatchObject({
      status: "ready",
      activeSlideIndex: 0,
      hasStickyOrFixed: false,
    });
  });

  it("updates activeSlideIndex on an activeSlide message", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, readyMessage(3));
    });
    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        version: 1,
        type: "activeSlide",
        index: 2,
      });
    });

    expect(result.current.state).toMatchObject({ activeSlideIndex: 2 });
  });

  it("ignores an activeSlide message before the first ready message", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        version: 1,
        type: "activeSlide",
        index: 2,
      });
    });

    expect(result.current.state).toEqual({ status: "loading" });
  });

  it("uses the runtime-provided activeSlideIndex on a resegmented message", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, readyMessage(5));
    });
    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        version: 1,
        type: "activeSlide",
        index: 4,
      });
    });
    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        ...readyMessage(2),
        type: "resegmented",
        activeSlideIndex: 1,
      });
    });

    expect(result.current.state).toMatchObject({ activeSlideIndex: 1 });
  });

  it("ignores a message from an origin other than the sandbox", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage("https://evil.example.com", readyMessage(1));
    });

    expect(result.current.state).toEqual({ status: "loading" });
  });

  it("posts a command to the bound iframe's contentWindow at the sandbox origin", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));
    const postMessage = vi.fn();
    const iframe = {
      contentWindow: { postMessage },
    } as unknown as HTMLIFrameElement;
    result.current.frameRef.current = iframe;

    result.current.sendCommand({ version: 1, type: "scrollToSlide", index: 2 });

    expect(postMessage).toHaveBeenCalledWith(
      { version: 1, type: "scrollToSlide", index: 2 },
      SANDBOX_ORIGIN,
    );
  });

  it("does not throw when sending a command with no iframe bound", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    expect(() =>
      result.current.sendCommand({
        version: 1,
        type: "setStageSlide",
        index: null,
      }),
    ).not.toThrow();
  });
});
