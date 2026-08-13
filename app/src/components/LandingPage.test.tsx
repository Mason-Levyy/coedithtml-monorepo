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

function stubUploadResponse() {
  const viewUrl = "https://sandbox.test/" + "a".repeat(32);
  const suggestUrl = "https://sandbox.test/" + "b".repeat(32);
  const editUrl = "https://sandbox.test/" + "c".repeat(32);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse(
        {
          artifactId: "a".repeat(32),
          viewToken: "a".repeat(32),
          suggestToken: "b".repeat(32),
          editToken: "c".repeat(32),
          viewUrl,
          suggestUrl,
          editUrl,
        },
        201,
      ),
    ),
  );
  return { viewUrl, suggestUrl, editUrl };
}

describe("LandingPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to the view-only link", async () => {
    const { viewUrl, suggestUrl, editUrl } = stubUploadResponse();

    renderLandingPage();
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText(viewUrl)).not.toThrow();
    });
    expect(screen.queryByText(suggestUrl)).toBeNull();
    expect(screen.queryByText(editUrl)).toBeNull();
  });

  it("uses the suggest link when the permission is set to suggest", async () => {
    const { viewUrl, suggestUrl } = stubUploadResponse();

    renderLandingPage();
    fireEvent.change(screen.getByLabelText("Permissions"), {
      target: { value: "suggest" },
    });
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText(suggestUrl)).not.toThrow();
    });
    expect(screen.queryByText(viewUrl)).toBeNull();
  });

  it("falls back to the suggest link when the permission is set to edit, since direct editing isn't built yet", async () => {
    const { viewUrl, suggestUrl, editUrl } = stubUploadResponse();

    renderLandingPage();
    fireEvent.change(screen.getByLabelText("Permissions"), {
      target: { value: "edit" },
    });
    fireEvent.change(getInput(), {
      target: { files: [htmlFile("deck.html", 100)] },
    });

    await vi.waitFor(() => {
      expect(() => screen.getByText(suggestUrl)).not.toThrow();
    });
    expect(screen.queryByText(viewUrl)).toBeNull();
    expect(screen.queryByText(editUrl)).toBeNull();
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
    const { viewUrl } = stubUploadResponse();

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
