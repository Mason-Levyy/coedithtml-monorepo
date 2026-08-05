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

function announceFit(mode: string, contentHeight: number): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: SANDBOX_ORIGIN,
        data: { version: 1, type: "fit", mode, contentHeight },
      }),
    );
  });
}

function frameHeight(): string {
  return screen.getByTitle("q3-review.html").style.height;
}

function viewerColumnClasses(): string {
  return document.querySelector("div.flex.flex-col")?.className ?? "";
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

  it("fills the frame until the artifact says how it wants to be sized", () => {
    renderViewer();

    expect(frameHeight()).toBe("100%");
  });

  // Without a definite parent height a percentage resolves to the 150px default.
  it("gives the frame a definite height to fill when nothing is reported", () => {
    renderViewer();

    expect(viewerColumnClasses()).toContain("h-dvh");
    expect(viewerColumnClasses()).not.toContain("min-h-dvh");
  });

  it("stops constraining the column once the frame grows to content", () => {
    renderViewer();

    announceFit("grows-to-content", 4200);

    expect(viewerColumnClasses()).toContain("min-h-dvh");
  });

  it("grows the frame to a document that wants the page to scroll", () => {
    renderViewer();

    announceFit("grows-to-content", 4200);

    expect(frameHeight()).toBe("4200px");
  });

  // Growing a self-scrolling artifact would strand its footer below the fold.
  it("leaves an artifact that scrolls itself filling the frame", () => {
    renderViewer();

    announceFit("scrolls-itself", 4200);

    expect(frameHeight()).toBe("100%");
  });

  it("clamps a height that runs away", () => {
    renderViewer();

    announceFit("grows-to-content", 10_000_000);

    expect(frameHeight()).toBe("10000px");
  });

  // A collapsed frame measures its own content as collapsed, so it never recovers.
  it("never collapses the frame on a degenerate height", () => {
    renderViewer();

    announceFit("grows-to-content", 0);

    expect(frameHeight()).toBe(`${window.innerHeight}px`);
  });

  it("ignores a fit message from any other origin", () => {
    renderViewer();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://evil.example",
          data: {
            version: 1,
            type: "fit",
            mode: "grows-to-content",
            contentHeight: 4200,
          },
        }),
      );
    });

    expect(frameHeight()).toBe("100%");
  });
});
