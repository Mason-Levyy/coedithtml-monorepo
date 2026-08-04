import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_ARTIFACT_BYTES,
  uploadArtifact,
  validateArtifactFile,
} from "./upload-artifact";

function htmlFile(name: string, byteLength: number): File {
  return new File([new Uint8Array(byteLength)], name, {
    type: "text/html",
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("validateArtifactFile", () => {
  it("accepts a small .html file", () => {
    expect(validateArtifactFile(htmlFile("deck.html", 100))).toBeNull();
  });

  it("accepts a .htm file", () => {
    expect(validateArtifactFile(htmlFile("deck.htm", 100))).toBeNull();
  });

  it("rejects a non-html file", () => {
    expect(validateArtifactFile(htmlFile("deck.pdf", 100))).toMatch(
      /\.html file/,
    );
  });

  it("rejects an empty file", () => {
    expect(validateArtifactFile(htmlFile("deck.html", 0))).toMatch(/empty/);
  });

  it("rejects a file larger than the budget", () => {
    expect(
      validateArtifactFile(htmlFile("deck.html", MAX_ARTIFACT_BYTES + 1)),
    ).toMatch(/5MB/);
  });
});

describe("uploadArtifact", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the file as form data and returns the parsed result", async () => {
    const result = {
      artifactId: "a".repeat(32),
      viewToken: "b".repeat(32),
      editToken: "c".repeat(32),
      viewUrl: "https://sandbox.test/" + "b".repeat(32),
      editUrl: "https://sandbox.test/" + "c".repeat(32),
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(result, 201));
    vi.stubGlobal("fetch", fetchMock);

    const returned = await uploadArtifact({
      file: htmlFile("deck.html", 100),
      password: null,
    });

    expect(returned).toEqual(result);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/artifacts");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form.get("file")).toBeInstanceOf(File);
  });

  it("throws the server's error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Too big." }, 413)),
    );

    await expect(
      uploadArtifact({ file: htmlFile("deck.html", 100), password: null }),
    ).rejects.toThrow("Too big.");
  });

  it("falls back to a generic message when the error body is unreadable", async () => {
    const response = new Response("not json", { status: 500 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(
      uploadArtifact({ file: htmlFile("deck.html", 100), password: null }),
    ).rejects.toThrow("Could not upload the file. Try again.");
  });

  it("throws when the success response fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ artifactId: "x" }, 201)),
    );

    await expect(
      uploadArtifact({ file: htmlFile("deck.html", 100), password: null }),
    ).rejects.toThrow(/unexpected response/);
  });
});
