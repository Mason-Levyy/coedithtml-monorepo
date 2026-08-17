import { describe, expect, it } from "vitest";
import type { StickyEntry } from "@coedithtml/protocol";
import type { WorkerEnv } from "@/lib/env";
import {
  FAKE_APP_HOST,
  fakeArtifactMetadata,
  liveKv,
  recordingArtifactMetadata,
  recordingArtifactStore,
  recordingDocRoom,
  testWorkerEnv,
} from "@/lib/fakes";
import { verifyArtifactPassword } from "@/lib/password";
import { MAX_UPLOAD_BODY_BYTES } from "@/lib/schemas/artifact";
import { handleUpload } from "./upload";

const VALID_HTML = `<!doctype html>
<html lang="en"><body><section><h1>Q3</h1></section></body></html>`;

function envWith(
  store: R2Bucket,
  metadata: KVNamespace = fakeArtifactMetadata() as unknown as KVNamespace,
): WorkerEnv {
  return testWorkerEnv({
    ARTIFACT_STORE: store,
    ARTIFACT_METADATA: metadata,
  });
}

function uploadRequest(
  files: { name: string; body: string }[],
  password?: string,
): Request {
  const form = new FormData();
  for (const file of files) {
    form.append(
      "file",
      new File([file.body], file.name, { type: "text/html" }),
    );
  }
  if (password !== undefined) {
    form.append("password", password);
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
    viewToken?: string;
    suggestToken?: string;
    editToken?: string;
    viewUrl?: string;
    suggestUrl?: string;
    editUrl?: string;
    restoredComments?: number;
    error?: string;
    reason?: string;
    headline?: string;
    remedy?: string | null;
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
    expect(put?.key).toMatch(
      new RegExp(`^artifacts/${body.artifactId}/[0-9a-f]{16}\\.html$`),
    );
  });

  it("stores metadata in KV alongside the R2 object", async () => {
    const store = recordingArtifactStore();
    const metadata = recordingArtifactMetadata();
    const response = await handleUpload(
      uploadRequest([{ name: "deck.html", body: VALID_HTML }]),
      envWith(store.bucket, metadata.kv),
    );
    const body = (await response.json()) as { artifactId: string };

    const metadataPut = metadata.puts.find(
      (put) => put.key === `artifacts/${body.artifactId}`,
    );
    expect(metadataPut && JSON.parse(metadataPut.value)).toMatchObject({
      fileName: "deck.html",
      size: VALID_HTML.length,
    });
  });

  it("mints distinct view, suggest, and edit tokens", async () => {
    const { response, body } = await upload([
      { name: "deck.html", body: VALID_HTML },
    ]);

    expect(response.status).toBe(201);
    expect(body.viewToken).toMatch(/^[0-9a-f]{32}$/);
    expect(body.suggestToken).toMatch(/^[0-9a-f]{32}$/);
    expect(body.editToken).toMatch(/^[0-9a-f]{32}$/);
    expect(
      new Set([body.viewToken, body.suggestToken, body.editToken]).size,
    ).toBe(3);
  });

  it("reports distinct view, suggest, and edit URLs on the app origin", async () => {
    const { body } = await upload([{ name: "deck.html", body: VALID_HTML }]);

    expect(body.viewUrl).toBe(`https://${FAKE_APP_HOST}/a/${body.viewToken}`);
    expect(body.suggestUrl).toBe(
      `https://${FAKE_APP_HOST}/a/${body.suggestToken}`,
    );
    expect(body.editUrl).toBe(`https://${FAKE_APP_HOST}/a/${body.editToken}`);
    expect(new Set([body.viewUrl, body.suggestUrl, body.editUrl]).size).toBe(3);
  });

  it("stores all three tokens in KV, each scoped to the artifact", async () => {
    const store = recordingArtifactStore();
    const metadata = recordingArtifactMetadata();
    const response = await handleUpload(
      uploadRequest([{ name: "deck.html", body: VALID_HTML }]),
      envWith(store.bucket, metadata.kv),
    );
    const body = (await response.json()) as {
      artifactId: string;
      viewToken: string;
      suggestToken: string;
      editToken: string;
    };

    const tokenPuts = metadata.puts.filter((put) =>
      put.key.startsWith("tokens/"),
    );
    expect(tokenPuts).toHaveLength(3);

    const viewPut = tokenPuts.find(
      (put) => put.key === `tokens/${body.viewToken}`,
    );
    const suggestPut = tokenPuts.find(
      (put) => put.key === `tokens/${body.suggestToken}`,
    );
    const editPut = tokenPuts.find(
      (put) => put.key === `tokens/${body.editToken}`,
    );
    // Each record holds its own kind and everything weaker, and nothing
    // stronger. A view token's record used to contain the edit token.
    expect(viewPut && JSON.parse(viewPut.value)).toEqual({
      artifactId: body.artifactId,
      kind: "view",
      siblingTokens: { view: body.viewToken },
    });
    expect(suggestPut && JSON.parse(suggestPut.value)).toEqual({
      artifactId: body.artifactId,
      kind: "suggest",
      siblingTokens: { view: body.viewToken, suggest: body.suggestToken },
    });
    expect(editPut && JSON.parse(editPut.value)).toEqual({
      artifactId: body.artifactId,
      kind: "edit",
      siblingTokens: {
        view: body.viewToken,
        suggest: body.suggestToken,
        edit: body.editToken,
      },
    });
  });

  it("keeps the stronger tokens out of a weaker token's record entirely", async () => {
    const metadata = recordingArtifactMetadata();
    const response = await handleUpload(
      uploadRequest([{ name: "deck.html", body: VALID_HTML }]),
      envWith(recordingArtifactStore().bucket, metadata.kv),
    );
    const body = (await response.json()) as {
      viewToken: string;
      editToken: string;
    };

    const viewPut = metadata.puts.find(
      (put) => put.key === `tokens/${body.viewToken}`,
    );

    expect(viewPut?.value).not.toContain(body.editToken);
  });

  it("omits passwordHash when no password is given", async () => {
    const store = recordingArtifactStore();
    const metadata = recordingArtifactMetadata();
    const response = await handleUpload(
      uploadRequest([{ name: "deck.html", body: VALID_HTML }]),
      envWith(store.bucket, metadata.kv),
    );
    const body = (await response.json()) as { artifactId: string };

    const metadataPut = metadata.puts.find(
      (put) => put.key === `artifacts/${body.artifactId}`,
    );
    expect(
      metadataPut && JSON.parse(metadataPut.value).passwordHash,
    ).toBeUndefined();
  });

  it("hashes and stores an optional password", async () => {
    const store = recordingArtifactStore();
    const metadata = recordingArtifactMetadata();
    const response = await handleUpload(
      uploadRequest([{ name: "deck.html", body: VALID_HTML }], "hunter2"),
      envWith(store.bucket, metadata.kv),
    );
    const body = (await response.json()) as { artifactId: string };

    const metadataPut = metadata.puts.find(
      (put) => put.key === `artifacts/${body.artifactId}`,
    );
    const storedHash =
      metadataPut && JSON.parse(metadataPut.value).passwordHash;

    expect(typeof storedHash).toBe("string");
    expect(storedHash).not.toBe("hunter2");
    expect(await verifyArtifactPassword("hunter2", storedHash)).toBe(true);
  });

  it("rejects a file that ships its own CSP meta tag", async () => {
    const { response, body } = await upload([
      {
        name: "deck.html",
        body: `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'"></head><body>hi</body></html>`,
      },
    ]);

    expect(response.status).toBe(415);
    expect(body.reason).toBe("has-own-csp");
    expect(body.remedy).toMatch(/Content-Security-Policy/i);
  });

  it("reports a metadata write failure without leaking the cause", async () => {
    const store = recordingArtifactStore();
    const metadata = recordingArtifactMetadata(() => {
      throw new Error("KV connection reset at internal-host-9");
    });

    const response = await handleUpload(
      uploadRequest([{ name: "deck.html", body: VALID_HTML }]),
      envWith(store.bucket, metadata.kv),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("Could not save the file. Try again.");
    expect(JSON.stringify(body)).not.toMatch(/internal-host-9/);
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
    expect(body.reason).toBe("several-files");
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
    expect(body.reason).toBe("not-html");
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
    expect(body.reason).toBe("needs-build-step");
    expect(body.remedy).toMatch(/build/i);
  });

  it("rate-limits repeated uploads from the same client", async () => {
    const store = recordingArtifactStore();
    const env = envWith(store.bucket, liveKv());

    let last: Response | undefined;
    for (let attempt = 0; attempt < 21; attempt += 1) {
      last = await handleUpload(
        uploadRequest([{ name: "deck.html", body: VALID_HTML }]),
        env,
      );
    }

    expect(last?.status).toBe(429);
  });

  it("refuses an oversized upload before reading the body", async () => {
    const request = new Request("https://app.test/api/artifacts", {
      method: "POST",
      headers: { "content-length": String(MAX_UPLOAD_BODY_BYTES + 1) },
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

  it("reports no restored comments for a plain upload", async () => {
    const { body } = await upload([{ name: "deck.html", body: VALID_HTML }]);

    expect(body.restoredComments).toBe(0);
  });
});

describe("handleUpload re-importing a previously downloaded file", () => {
  function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
    return {
      kind: "sticky",
      id: "s1",
      parentId: null,
      anchor: {
        kind: "region",
        path: "body",
        fractionX: 0.5,
        fractionY: 0.5,
        revision: "old-revision",
      },
      body: "Looks great",
      author: { id: "reader-2", displayName: "Priya", source: "anonymous" },
      color: "yellow",
      fill: null,
      status: "open",
      createdAt: "2026-08-13T12:00:00.000Z",
      offsetX: 0,
      offsetY: 0,
      width: null,
      height: null,
      tail: null,
      ...overrides,
    };
  }

  function downloadedHtml(stickies: StickyEntry[]): string {
    const payload = JSON.stringify({ edits: [], stickies });
    return `${VALID_HTML}\n<script>window.__coeditDownload__=${payload};\nconsole.log("bundle")</script>\n`;
  }

  it("reports the restored comment count and seeds the room", async () => {
    const store = recordingArtifactStore();
    const docRoom = recordingDocRoom();
    const env = testWorkerEnv({
      ARTIFACT_STORE: store.bucket,
      ARTIFACT_METADATA: fakeArtifactMetadata(),
      DOC_ROOM: docRoom.namespace,
    });

    const response = await handleUpload(
      uploadRequest([{ name: "deck.html", body: downloadedHtml([sticky()]) }]),
      env,
    );
    const body = (await response.json()) as {
      artifactId: string;
      restoredComments: number;
    };

    expect(response.status).toBe(201);
    expect(body.restoredComments).toBe(1);

    const seeded = docRoom.connects.find(
      (connect) => connect.name === body.artifactId,
    );
    expect(seeded).toBeDefined();
    const entries = seeded && ((await seeded.request.json()) as StickyEntry[]);
    expect(entries).toMatchObject([{ id: "s1", body: "Looks great" }]);
  });

  it("restores stickies for a draft upload too, not only an immediate publish", async () => {
    const store = recordingArtifactStore();
    const docRoom = recordingDocRoom();
    const env = testWorkerEnv({
      ARTIFACT_STORE: store.bucket,
      ARTIFACT_METADATA: fakeArtifactMetadata(),
      DOC_ROOM: docRoom.namespace,
    });

    const form = new FormData();
    form.append(
      "file",
      new File([downloadedHtml([sticky()])], "deck.html", {
        type: "text/html",
      }),
    );
    form.append("draft", "true");
    const request = new Request("https://app.test/api/artifacts", {
      method: "POST",
      body: form,
    });

    const response = await handleUpload(request, env);
    const body = (await response.json()) as {
      artifactId: string;
      draft: true;
      restoredComments: number;
    };

    expect(response.status).toBe(201);
    expect(body.draft).toBe(true);
    expect(body.restoredComments).toBe(1);

    const seeded = docRoom.connects.find(
      (connect) => connect.name === body.artifactId,
    );
    expect(seeded).toBeDefined();
    const entries = seeded && ((await seeded.request.json()) as StickyEntry[]);
    expect(entries).toMatchObject([{ id: "s1", body: "Looks great" }]);
  });

  it("does not touch the room when there is nothing to restore", async () => {
    const store = recordingArtifactStore();
    const docRoom = recordingDocRoom();
    const env = testWorkerEnv({
      ARTIFACT_STORE: store.bucket,
      ARTIFACT_METADATA: fakeArtifactMetadata(),
      DOC_ROOM: docRoom.namespace,
    });

    await handleUpload(
      uploadRequest([{ name: "deck.html", body: VALID_HTML }]),
      env,
    );

    expect(docRoom.connects).toHaveLength(0);
  });

  it("stores the artifact stripped of its old download script, not as re-uploaded", async () => {
    const store = recordingArtifactStore();
    const env = testWorkerEnv({
      ARTIFACT_STORE: store.bucket,
      ARTIFACT_METADATA: fakeArtifactMetadata(),
      DOC_ROOM: recordingDocRoom().namespace,
    });

    await handleUpload(
      uploadRequest([{ name: "deck.html", body: downloadedHtml([sticky()]) }]),
      env,
    );

    expect(store.puts).toHaveLength(1);
    const stored =
      store.puts[0] && new TextDecoder().decode(store.puts[0].bytes);
    expect(stored).toBe(VALID_HTML);
    expect(stored).not.toMatch(/__coeditDownload__/);
  });
});
