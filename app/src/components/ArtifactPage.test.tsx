import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArtifactPage } from "./ArtifactPage";

const TOKEN = "b".repeat(32);
const REVISION = "9f2c1a04b7e35d68";

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
      requiresPassword: false,
      artifactId: "c".repeat(32),
      fileName: "deck.html",
      size: 42,
      uploadedAt: "2026-08-01T00:00:00.000Z",
      revision: REVISION,
      profile: null,
      sandboxOrigin: "https://sandbox.example.com",
      artifactUrl: `https://sandbox.example.com/${TOKEN}`,
      shareLinks: { view: `https://app.example.com/a/${TOKEN}` },
    });

    renderPage();

    const frame = await screen.findByTitle("deck.html");
    expect(frame).toHaveProperty(
      "src",
      `https://sandbox.example.com/${TOKEN}?r=${REVISION}`,
    );
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

  describe("password gate", () => {
    it("asks for a password instead of framing anything", async () => {
      respondWith(200, { requiresPassword: true });
      renderPage();

      expect(await screen.findByLabelText(/needs a password/i)).toBeTruthy();
      expect(screen.queryByTitle("deck.html")).toBeNull();
    });

    it("posts the password to the unlock route rather than a query string", async () => {
      const calls: [string, RequestInit | undefined][] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string, init?: RequestInit) => {
          calls.push([url, init]);
          const locked = init === undefined;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve(
                locked
                  ? { requiresPassword: true }
                  : {
                      requiresPassword: false,
                      artifactId: "c".repeat(32),
                      fileName: "deck.html",
                      size: 42,
                      uploadedAt: "2026-08-01T00:00:00.000Z",
                      revision: REVISION,
                      profile: null,
                      sandboxOrigin: "https://sandbox.example.com",
                      artifactUrl: `https://sandbox.example.com/${TOKEN}?u=${"9".repeat(32)}`,
                      shareLinks: {
                        view: `https://app.example.com/a/${TOKEN}`,
                      },
                    },
              ),
          });
        }),
      );
      renderPage();

      const field = await screen.findByLabelText(/needs a password/i);
      fireEvent.change(field, { target: { value: "hunter2" } });
      fireEvent.click(screen.getByRole("button", { name: "Open" }));

      await screen.findByTitle("deck.html");

      const unlockCall = calls.find(([url]) => url.endsWith("/unlock"));
      expect(unlockCall?.[0]).toBe(`/api/artifacts/${TOKEN}/unlock`);
      expect(unlockCall?.[1]?.method).toBe("POST");
      expect(unlockCall?.[1]?.body).toBe(
        JSON.stringify({ password: "hunter2" }),
      );
      expect(calls.every(([url]) => !url.includes("hunter2"))).toBe(true);
    });

    it("shows the server's message when the password is wrong", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn((_url: string, init?: RequestInit) =>
          Promise.resolve({
            ok: init === undefined,
            status: init === undefined ? 200 : 401,
            json: () =>
              Promise.resolve(
                init === undefined
                  ? { requiresPassword: true }
                  : { error: "Incorrect password." },
              ),
          }),
        ),
      );
      renderPage();

      const field = await screen.findByLabelText(/needs a password/i);
      fireEvent.change(field, { target: { value: "nope" } });
      fireEvent.click(screen.getByRole("button", { name: "Open" }));

      expect(await screen.findByText("Incorrect password.")).toBeTruthy();
    });
  });
});
