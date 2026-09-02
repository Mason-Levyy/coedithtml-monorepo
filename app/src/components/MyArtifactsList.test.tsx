import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, renderWithQueryClient } from "@/lib/fakes";
import { MyArtifactsList } from "./MyArtifactsList";

describe("MyArtifactsList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders empty state when no artifacts exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ artifacts: [] }, 200)),
    );

    renderWithQueryClient(<MyArtifactsList onUploadClick={vi.fn()} />);

    await vi.waitFor(() => {
      expect(screen.getByText("No files uploaded yet")).toBeDefined();
    });
  });

  it("renders list of files with password badge and actions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            artifacts: [
              {
                artifactId: "art1",
                fileName: "quarterly.html",
                size: 1024,
                uploadedAt: "2026-08-01T00:00:00.000Z",
                published: true,
                hasPassword: true,
                viewToken: "tok1",
                viewUrl: "https://sandbox.test/a/tok1",
              },
            ],
          },
          200,
        ),
      ),
    );

    renderWithQueryClient(<MyArtifactsList onUploadClick={vi.fn()} />);

    await vi.waitFor(() => {
      expect(screen.getByText("quarterly.html")).toBeDefined();
      expect(screen.getByText("Password")).toBeDefined();
      expect(screen.getByText("Copy Link")).toBeDefined();
    });
  });

  it("tells the owner a file is about to be swept, and how to stop it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            artifacts: [
              {
                artifactId: "art1",
                fileName: "quarterly.html",
                size: 1024,
                uploadedAt: "2026-07-01T00:00:00.000Z",
                published: true,
                hasPassword: false,
                expiresAt: "2026-08-20T00:00:00.000Z",
              },
            ],
          },
          200,
        ),
      ),
    );

    renderWithQueryClient(<MyArtifactsList onUploadClick={vi.fn()} />);

    await vi.waitFor(() => {
      expect(
        screen.getByText(/Nobody has opened this in a while/),
      ).toBeDefined();
    });
    expect(screen.getByText(/unless somebody does/)).toBeDefined();
  });

  it("says nothing about expiry for a file nobody is about to lose", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            artifacts: [
              {
                artifactId: "art1",
                fileName: "quarterly.html",
                size: 1024,
                uploadedAt: "2026-08-01T00:00:00.000Z",
                published: true,
                hasPassword: false,
              },
            ],
          },
          200,
        ),
      ),
    );

    renderWithQueryClient(<MyArtifactsList onUploadClick={vi.fn()} />);

    await vi.waitFor(() => {
      expect(screen.getByText("quarterly.html")).toBeDefined();
    });
    expect(screen.queryByText(/Nobody has opened this/)).toBeNull();
  });

  it("opens settings modal when Settings is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            artifacts: [
              {
                artifactId: "art1",
                fileName: "quarterly.html",
                size: 1024,
                uploadedAt: "2026-08-01T00:00:00.000Z",
                published: true,
                hasPassword: false,
                viewToken: "tok1",
              },
            ],
          },
          200,
        ),
      ),
    );

    renderWithQueryClient(<MyArtifactsList onUploadClick={vi.fn()} />);

    await vi.waitFor(() => {
      expect(screen.getByText("quarterly.html")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Settings"));

    expect(screen.getByText("Manage File Settings")).toBeDefined();
    expect(screen.getByText("Delete this file")).toBeDefined();
  });
});
