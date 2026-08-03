import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LandingPage />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("LandingPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the share link after a successful upload", async () => {
    const viewUrl = "https://sandbox.test/" + "a".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            artifactId: "a".repeat(32),
            viewToken: "b".repeat(32),
            editToken: "c".repeat(32),
            viewUrl,
            editUrl: "https://sandbox.test/" + "c".repeat(32),
          },
          201,
        ),
      ),
    );

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText(viewUrl)).not.toThrow();
    });
  });

  it("shows the server's error message and lets the reader try again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Too big." }, 413)),
    );

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText("Too big.")).not.toThrow();
    });
    expect(() => screen.getByText(/Drop a \.html file/)).not.toThrow();
  });

  it("returns to the dropzone after Upload another", async () => {
    const viewUrl = "https://sandbox.test/" + "a".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            artifactId: "a".repeat(32),
            viewToken: "b".repeat(32),
            editToken: "c".repeat(32),
            viewUrl,
            editUrl: "https://sandbox.test/" + "c".repeat(32),
          },
          201,
        ),
      ),
    );

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });
    await vi.waitFor(() => {
      expect(() => screen.getByText(viewUrl)).not.toThrow();
    });

    fireEvent.click(screen.getByText("Upload another"));

    await vi.waitFor(() => {
      expect(() => screen.getByText(/Drop a \.html file/)).not.toThrow();
    });
  });
});
