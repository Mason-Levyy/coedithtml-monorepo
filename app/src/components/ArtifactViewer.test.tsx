import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactViewer } from "./ArtifactViewer";

const SANDBOX_ORIGIN = "https://sandbox.example.com";
const SRC = `${SANDBOX_ORIGIN}/${"a".repeat(32)}`;

function renderViewer() {
  return render(
    <ArtifactViewer
      src={SRC}
      sandboxOrigin={SANDBOX_ORIGIN}
      fileName="q3-review.html"
    />,
  );
}

function announceReady(title: string, origin = SANDBOX_ORIGIN): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin,
        data: { version: 1, type: "ready", title },
      }),
    );
  });
}

describe("ArtifactViewer", () => {
  it("frames the artifact at the given source", () => {
    renderViewer();

    expect(screen.getByTitle("q3-review.html")).toHaveProperty("src", SRC);
  });

  it("shows the file name until the artifact reports its own title", () => {
    renderViewer();

    expect(screen.getByText("q3-review.html")).toBeTruthy();
  });

  it("prefers the title the artifact reports", () => {
    renderViewer();

    announceReady("Make artifacts work like documents");

    expect(screen.getByText("Make artifacts work like documents")).toBeTruthy();
  });

  it("ignores a ready message from any other origin", () => {
    renderViewer();

    announceReady("Injected", "https://evil.example");

    expect(screen.queryByText("Injected")).toBeNull();
  });

  it("adds no navigation of its own, only the share control", () => {
    renderViewer();

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Copy link",
    ]);
  });
});
