import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactViewer } from "./ArtifactViewer";

const SANDBOX_ORIGIN = "https://sandbox.example.com";

function dispatchMessage(data: unknown): void {
  window.dispatchEvent(
    new MessageEvent("message", { origin: SANDBOX_ORIGIN, data }),
  );
}

function segmentMessage(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    type: "ready",
    slides: [
      { index: 0, startChild: 0, endChild: 1, label: "Intro" },
      { index: 1, startChild: 2, endChild: 2, label: "Details" },
    ],
    profile: "slides",
    hasStickyOrFixed: false,
    ...overrides,
  };
}

describe("ArtifactViewer", () => {
  it("shows no status bar or filmstrip before the runtime reports ready", () => {
    render(
      <ArtifactViewer
        src={`${SANDBOX_ORIGIN}/abc123`}
        sandboxOrigin={SANDBOX_ORIGIN}
        title="Deck"
      />,
    );

    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("shows the filmstrip and status bar for a multi-slide artifact", () => {
    render(
      <ArtifactViewer
        src={`${SANDBOX_ORIGIN}/abc123`}
        sandboxOrigin={SANDBOX_ORIGIN}
        title="Deck"
      />,
    );

    act(() => {
      dispatchMessage(segmentMessage());
    });

    expect(() => screen.getByRole("tablist")).not.toThrow();
    expect(() => screen.getByText("1 of 2")).not.toThrow();
  });

  it("shows an honest single-view message instead of a filmstrip for an app-shaped artifact", () => {
    render(
      <ArtifactViewer
        src={`${SANDBOX_ORIGIN}/abc123`}
        sandboxOrigin={SANDBOX_ORIGIN}
        title="Calculator"
      />,
    );

    act(() => {
      dispatchMessage(
        segmentMessage({
          slides: [
            { index: 0, startChild: 0, endChild: 3, label: "Calculator" },
          ],
          profile: "app",
        }),
      );
    });

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(() =>
      screen.getByText("This reads as one continuous view, not a slide deck."),
    ).not.toThrow();
  });

  it("shows the sticky/fixed warning only when the runtime detects it", () => {
    render(
      <ArtifactViewer
        src={`${SANDBOX_ORIGIN}/abc123`}
        sandboxOrigin={SANDBOX_ORIGIN}
        title="Deck"
      />,
    );

    act(() => {
      dispatchMessage(segmentMessage({ hasStickyOrFixed: true }));
    });

    expect(() =>
      screen.getByText(/Stage mode can break fixed or sticky positioning/),
    ).not.toThrow();
  });

  it("does not show the sticky/fixed warning when the runtime finds none", () => {
    render(
      <ArtifactViewer
        src={`${SANDBOX_ORIGIN}/abc123`}
        sandboxOrigin={SANDBOX_ORIGIN}
        title="Deck"
      />,
    );

    act(() => {
      dispatchMessage(segmentMessage({ hasStickyOrFixed: false }));
    });

    expect(
      screen.queryByText(/Stage mode can break fixed or sticky positioning/),
    ).toBeNull();
  });
});
