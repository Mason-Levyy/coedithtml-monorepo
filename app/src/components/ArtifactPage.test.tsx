import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArtifactPage } from "./ArtifactPage";

const TOKEN = "b".repeat(32);

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ArtifactPage token={TOKEN} />
    </QueryClientProvider>,
  );
}

function respondWith(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: status < 400,
        status,
        json: () => Promise.resolve(body),
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ArtifactPage", () => {
  it("frames the artifact at the sandbox URL the server returned", async () => {
    respondWith(200, {
      artifactId: "c".repeat(32),
      fileName: "deck.html",
      size: 42,
      uploadedAt: "2026-08-01T00:00:00.000Z",
      sandboxOrigin: "https://sandbox.example.com",
      artifactUrl: `https://sandbox.example.com/${TOKEN}`,
    });

    renderPage();

    const frame = await screen.findByTitle("deck.html");
    expect(frame).toHaveProperty("src", `https://sandbox.example.com/${TOKEN}`);
  });

  it("requests the artifact by token", async () => {
    respondWith(404, { error: "Not found." });
    renderPage();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/artifacts/${TOKEN}`);
    });
  });

  it("shows the server's message when the artifact cannot be loaded", async () => {
    respondWith(404, { error: "Not found." });
    renderPage();

    expect(await screen.findByText("Not found.")).toBeTruthy();
  });
});
