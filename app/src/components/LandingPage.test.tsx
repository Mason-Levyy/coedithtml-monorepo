import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, renderWithQueryClient } from "@/lib/fakes";
import { LandingPage } from "./LandingPage";

function htmlFile(name: string, byteLength: number): File {
  return new File([new Uint8Array(byteLength)], name, { type: "text/html" });
}

function getInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("expected a file input");
  }
  return input;
}

function renderLandingPage() {
  return renderWithQueryClient(<LandingPage />);
}

function stubTwoStepUploadAndPublish() {
  const viewUrl = "https://sandbox.test/" + "a".repeat(32);
  const suggestUrl = "https://sandbox.test/" + "b".repeat(32);
  const editUrl = "https://sandbox.test/" + "c".repeat(32);

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string | Request) => {
      const urlStr = typeof url === "string" ? url : url.url;
      if (urlStr.includes("/api/my-artifacts")) {
        return Promise.resolve(jsonResponse({ artifacts: [] }, 200));
      }
      if (urlStr.includes("/publish")) {
        return Promise.resolve(
          jsonResponse(
            {
              artifactId: "a".repeat(32),
              viewToken: "a".repeat(32),
              suggestToken: "b".repeat(32),
              editToken: "c".repeat(32),
              viewUrl,
              suggestUrl,
              editUrl,
              published: true,
              hasPassword: false,
            },
            200,
          ),
        );
      }
      if (urlStr.includes("/api/artifacts")) {
        return Promise.resolve(
          jsonResponse(
            {
              artifactId: "a".repeat(32),
              fileName: "deck.html",
              size: 100,
              uploadedAt: new Date().toISOString(),
              draft: true,
            },
            201,
          ),
        );
      }
      return Promise.resolve(jsonResponse({}, 404));
    }),
  );
  return { viewUrl, suggestUrl, editUrl };
}

describe("LandingPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("walks through two-step upload and publish flow", async () => {
    const { viewUrl } = stubTwoStepUploadAndPublish();

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText("Step 2 of 2")).not.toThrow();
    });

    fireEvent.click(screen.getByText("Publish link"));

    await vi.waitFor(() => {
      expect(() => screen.getByText(viewUrl)).not.toThrow();
    });
  });

  it("allows switching permissions during publish step", async () => {
    const { editUrl } = stubTwoStepUploadAndPublish();

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText("Step 2 of 2")).not.toThrow();
    });

    fireEvent.click(screen.getByText("Edit directly"));
    fireEvent.click(screen.getByText("Publish link"));

    await vi.waitFor(() => {
      expect(() => screen.getByText(editUrl)).not.toThrow();
    });
  });

  it("shows the server's rejection error in the error card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string | Request) => {
        const urlStr = typeof url === "string" ? url : url.url;
        if (urlStr.includes("/api/my-artifacts")) {
          return Promise.resolve(jsonResponse({ artifacts: [] }, 200));
        }
        return Promise.resolve(
          jsonResponse(
            {
              error:
                "This file needs a build step. Upload the HTML a browser would run, not its source.",
            },
            415,
          ),
        );
      }),
    );

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText("Upload rejected")).not.toThrow();
      expect(() =>
        screen.getByText(
          "This file needs a build step. Upload the HTML a browser would run, not its source.",
        ),
      ).not.toThrow();
    });
    expect(() => screen.getByText(/Drop a \.html file/)).not.toThrow();
  });

  it("switches to My Files tab and back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ artifacts: [] }, 200)),
    );

    renderLandingPage();
    fireEvent.click(screen.getByText("My Files"));

    await vi.waitFor(() => {
      expect(() => screen.getByText("No files uploaded yet")).not.toThrow();
    });

    fireEvent.click(screen.getByText("Upload"));
    await vi.waitFor(() => {
      expect(() => screen.getByText(/Drop a \.html file/)).not.toThrow();
    });
  });

  it("returns to the dropzone after Upload another", async () => {
    const { viewUrl } = stubTwoStepUploadAndPublish();

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });
    await vi.waitFor(() => {
      expect(() => screen.getByText("Step 2 of 2")).not.toThrow();
    });

    fireEvent.click(screen.getByText("Publish link"));
    await vi.waitFor(() => {
      expect(() => screen.getByText(viewUrl)).not.toThrow();
    });

    fireEvent.click(screen.getByText("Upload another"));

    await vi.waitFor(() => {
      expect(() => screen.getByText(/Drop a \.html file/)).not.toThrow();
    });
  });
});
