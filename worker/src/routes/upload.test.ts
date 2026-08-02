import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@/lib/env";
import { recordingArtifactStore } from "@/lib/fakes";
import { MAX_ARTIFACT_BYTES } from "@/lib/schemas/artifact";
import { handleUpload } from "./upload";

const VALID_HTML = `<!doctype html>
<html lang="en"><body><section><h1>Q3</h1></section></body></html>`;

function envWith(store: R2Bucket): WorkerEnv {
  return { ARTIFACT_STORE: store } as unknown as WorkerEnv;
}

function uploadRequest(files: { name: string; body: string }[]): Request {
  const form = new FormData();
  for (const file of files) {
    form.append(
      "file",
      new File([file.body], file.name, { type: "text/html" }),
    );
  }
  return new Request("https://app.test/api/artifacts", {
    method: "POST",
    body: form,
  });
}

async function upload(
  files: { name: string; body: string }[],
  store = recordingArtifactStore(),
) {
  const response = await handleUpload(
    uploadRequest(files),
    envWith(store.bucket),
  );
  const body = (await response.json()) as {
    artifactId?: string;
    error?: string;
  };
  return { response, body, store };
}

describe("handleUpload", () => {
  it("accepts a single .html file and reports an artifact id", async () => {
    const { response, body } = await upload([
      { name: "deck.html", body: VALID_HTML },
    ]);

    expect(response.status).toBe(201);
    expect(body.artifactId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("stores the uploaded bytes unmodified", async () => {
    const { store, body } = await upload([
      { name: "deck.html", body: VALID_HTML },
    ]);

    expect(store.puts).toHaveLength(1);
    const [put] = store.puts;
    expect(put && new TextDecoder().decode(put.bytes)).toBe(VALID_HTML);
    expect(put?.key).toBe(`artifacts/${body.artifactId}.html`);
  });

  it("gives each upload a distinct id", async () => {
    const first = await upload([{ name: "a.html", body: VALID_HTML }]);
    const second = await upload([{ name: "a.html", body: VALID_HTML }]);

    expect(first.body.artifactId).not.toBe(second.body.artifactId);
  });

  it("rejects a file that is not .html", async () => {
    const { response, store } = await upload([
      { name: "deck.jsx", body: VALID_HTML },
    ]);

    expect(response.status).toBe(400);
    expect(store.puts).toHaveLength(0);
  });

  it("rejects several files at once", async () => {
    const { response, body, store } = await upload([
      { name: "a.html", body: VALID_HTML },
      { name: "b.html", body: VALID_HTML },
    ]);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/one file/i);
    expect(store.puts).toHaveLength(0);
  });

  it("rejects an empty file", async () => {
    const { response, store } = await upload([{ name: "a.html", body: "" }]);

    expect(response.status).toBe(400);
    expect(store.puts).toHaveLength(0);
  });

  it("rejects a document that is not complete HTML", async () => {
    const { response, body, store } = await upload([
      { name: "a.html", body: "<div>fragment</div>" },
    ]);

    expect(response.status).toBe(415);
    expect(body.error).toMatch(/not an HTML document/i);
    expect(store.puts).toHaveLength(0);
  });

  it("rejects a file renamed .html that still needs a build step", async () => {
    const { response, body } = await upload([
      {
        name: "deck.html",
        body: `import React from "react";\nexport default function A() { return <B />; }`,
      },
    ]);

    expect(response.status).toBe(415);
    expect(body.error).toMatch(/build step/i);
  });

  it("refuses an oversized upload before reading the body", async () => {
    const request = new Request("https://app.test/api/artifacts", {
      method: "POST",
      headers: { "content-length": String(MAX_ARTIFACT_BYTES + 1) },
      body: "x",
    });
    const store = recordingArtifactStore();

    const response = await handleUpload(request, envWith(store.bucket));

    expect(response.status).toBe(413);
    expect(store.puts).toHaveLength(0);
  });

  it("rejects a body that is not form data", async () => {
    const request = new Request("https://app.test/api/artifacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"file":"deck.html"}',
    });

    const response = await handleUpload(
      request,
      envWith(recordingArtifactStore().bucket),
    );

    expect(response.status).toBe(400);
  });

  it("reports a storage failure without leaking the cause", async () => {
    const store = recordingArtifactStore(() => {
      throw new Error("R2 connection reset at internal-host-9");
    });

    const { response, body } = await upload(
      [{ name: "a.html", body: VALID_HTML }],
      store,
    );

    expect(response.status).toBe(500);
    expect(body.error).toBe("Could not save the file. Try again.");
    expect(JSON.stringify(body)).not.toMatch(/internal-host-9/);
  });
});
