import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useArtifactBridge } from "./useArtifactBridge";

const SANDBOX_ORIGIN = "https://sandbox.example.com";

function dispatchMessage(origin: string, data: unknown): void {
  window.dispatchEvent(new MessageEvent("message", { origin, data }));
}

describe("useArtifactBridge", () => {
  it("starts in the loading state", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    expect(result.current).toEqual({ status: "loading" });
  });

  it("becomes ready on a valid message from the sandbox origin", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        version: 1,
        type: "ready",
        slides: [{ index: 0, startChild: 0, endChild: 0, label: "One" }],
        profile: "slides",
      });
    });

    expect(result.current).toEqual({
      status: "ready",
      slides: [{ index: 0, startChild: 0, endChild: 0, label: "One" }],
      profile: "slides",
    });
  });

  it("ignores a message from an origin other than the sandbox", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage("https://evil.example.com", {
        version: 1,
        type: "ready",
        slides: [],
        profile: "app",
      });
    });

    expect(result.current).toEqual({ status: "loading" });
  });

  it("ignores a malformed message from the sandbox origin", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, { hello: "world" });
    });

    expect(result.current).toEqual({ status: "loading" });
  });

  it("updates again on a later resegmented message", () => {
    const { result } = renderHook(() => useArtifactBridge(SANDBOX_ORIGIN));

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        version: 1,
        type: "ready",
        slides: [{ index: 0, startChild: 0, endChild: 0, label: "One" }],
        profile: "slides",
      });
    });
    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        version: 1,
        type: "resegmented",
        slides: [
          { index: 0, startChild: 0, endChild: 0, label: "One" },
          { index: 1, startChild: 1, endChild: 1, label: "Two" },
        ],
        profile: "slides",
      });
    });

    expect(result.current).toMatchObject({ status: "ready" });
    expect(
      result.current.status === "ready" ? result.current.slides.length : -1,
    ).toBe(2);
  });

  it("stops updating after unmount", () => {
    const { result, unmount } = renderHook(() =>
      useArtifactBridge(SANDBOX_ORIGIN),
    );
    unmount();

    act(() => {
      dispatchMessage(SANDBOX_ORIGIN, {
        version: 1,
        type: "ready",
        slides: [],
        profile: "app",
      });
    });

    expect(result.current).toEqual({ status: "loading" });
  });
});
