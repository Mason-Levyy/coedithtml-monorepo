import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQueryClient } from "@/lib/fakes";
import { ArtifactViewer } from "./ArtifactViewer";

const SANDBOX_ORIGIN = "https://sandbox.example.com";
const TOKEN = "a".repeat(32);
const SRC = `${SANDBOX_ORIGIN}/${TOKEN}`;

function renderViewer() {
  return renderWithQueryClient(
    <ArtifactViewer
      token={TOKEN}
      src={SRC}
      sandboxOrigin={SANDBOX_ORIGIN}
      fileName="q3-review.html"
      revision="9f2c1a04b7e35d68"
      shareLinks={{ view: `https://app.example.com/a/${TOKEN}` }}
      tutorial={false}
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

function watchRuntimeMessages(): { type: unknown }[] {
  const posted: { type: unknown }[] = [];
  const frame = screen.getByTitle("q3-review.html") as HTMLIFrameElement;
  Object.defineProperty(frame, "contentWindow", {
    configurable: true,
    value: {
      postMessage: (message: { type: unknown }) => posted.push(message),
    },
  });
  return posted;
}

function viewerColumnClasses(): string {
  return document.querySelector("div.flex")?.className ?? "";
}

describe("ArtifactViewer", () => {
  it("frames the artifact at the given source", () => {
    renderViewer();

    expect(screen.getByTitle("q3-review.html")).toHaveProperty("src", SRC);
  });

  it("waits for the frame before telling it what the reader may do", () => {
    renderViewer();
    const posted = watchRuntimeMessages();

    announceReady("Pitch");

    expect(posted.map((message) => message.type)).toContain("set-capabilities");
  });

  it("ignores a ready message from any other origin", () => {
    renderViewer();

    announceReady("Injected", "https://evil.example");

    expect(screen.queryByText("Injected")).toBeNull();
  });

  it("adds no navigation of its own, only the share and rail controls", () => {
    renderViewer();

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("menubar")).toBeNull();
    expect(
      screen
        .getAllByRole("button")
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent,
        ),
    ).toEqual(["Hide comments", "Download", "Close comments"]);
  });

  it("offers a view-only reader the file but never a way to share it", () => {
    renderViewer();

    expect(screen.getByRole("button", { name: "Download" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  });

  it("fills the frame until the artifact says how it wants to be sized", () => {
    renderViewer();

    expect(frameHeight()).toBe("100%");
  });

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
