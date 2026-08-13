import { describe, expect, it } from "vitest";
import { artifactMetadataSchema } from "@/lib/artifact-metadata";
import { revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { liveKv, recordingArtifactStore, testWorkerEnv } from "@/lib/fakes";
import { accessTokenKey, artifactMetadataKey } from "@/lib/storage-keys";
import type { RecordingBucket } from "@/lib/fakes";
import { handleReplaceArtifact } from "./revisions";

const ARTIFACT_ID = "b".repeat(32);
const EDIT_TOKEN = "e".repeat(32);
const VIEW_TOKEN = "d".repeat(32);
const FIRST_HTML = `<!doctype html>
<html lang="en"><body><h1>Q3</h1></body></html>`;
const SECOND_HTML = `<!doctype html>
<html lang="en"><body><h1>Q4</h1></body></html>`;

function encode(source: string): ArrayBuffer {
  return new Uint8Array(new TextEncoder().encode(source)).buffer;
}

async function firstRevision(): Promise<string> {
  return revisionOf(encode(FIRST_HTML));
}

function replaceRequest(html: string, fileName = "deck.html"): Request {
  const form = new FormData();
  form.append("file", new File([html], fileName, { type: "text/html" }));
  return new Request(`https://app.test/api/artifacts/${EDIT_TOKEN}/revisions`, {
    method: "POST",
    body: form,
  });
}

async function envFor(store: R2Bucket, kv: KVNamespace): Promise<WorkerEnv> {
  return testWorkerEnv({ ARTIFACT_STORE: store, ARTIFACT_METADATA: kv });
}

async function knownArtifact(): Promise<{
  env: WorkerEnv;
  store: RecordingBucket;
  kv: KVNamespace;
}> {
  const store = recordingArtifactStore();
  const kv = liveKv([
    {
      key: accessTokenKey(EDIT_TOKEN),
      value: { artifactId: ARTIFACT_ID, kind: "edit" },
    },
    {
      key: accessTokenKey(VIEW_TOKEN),
      value: { artifactId: ARTIFACT_ID, kind: "view" },
    },
    {
      key: artifactMetadataKey(ARTIFACT_ID),
      value: {
        fileName: "deck.html",
        size: FIRST_HTML.length,
        uploadedAt: "2026-08-01T00:00:00.000Z",
        revision: await firstRevision(),
        previousRevisions: [],
      },
    },
  ]);
  return { env: await envFor(store.bucket, kv), store, kv };
}

async function storedMetadata(kv: KVNamespace) {
  const raw = await kv.get(`artifacts/${ARTIFACT_ID}`);
  return artifactMetadataSchema.parse(JSON.parse(raw ?? "{}"));
}

describe("handleReplaceArtifact", () => {
  it("stores the new bytes under a new revision and keeps the artifact id", async () => {
    const { env, store, kv } = await knownArtifact();

    const response = await handleReplaceArtifact(
      EDIT_TOKEN,
      replaceRequest(SECOND_HTML),
      env,
    );
    const body = (await response.json()) as {
      revision: string;
      replaced: boolean;
    };
    const metadata = await storedMetadata(kv);

    expect(response.status).toBe(200);
    expect(body.replaced).toBe(true);
    expect(body.revision).toBe(await revisionOf(encode(SECOND_HTML)));
    expect(metadata.revision).toBe(body.revision);
    expect(metadata.previousRevisions).toEqual([await firstRevision()]);
    expect(store.puts.at(-1)?.key).toBe(
      `artifacts/${ARTIFACT_ID}/${body.revision}.html`,
    );
  });

  it("leaves the previous revision's object in place", async () => {
    const { env, store } = await knownArtifact();

    await handleReplaceArtifact(EDIT_TOKEN, replaceRequest(SECOND_HTML), env);

    expect(store.puts).toHaveLength(1);
    expect(store.puts.at(0)?.key).not.toContain(await firstRevision());
  });

  it("stores the replacement bytes unmodified", async () => {
    const { env, store } = await knownArtifact();

    await handleReplaceArtifact(EDIT_TOKEN, replaceRequest(SECOND_HTML), env);

    expect(new TextDecoder().decode(store.puts.at(0)?.bytes)).toBe(SECOND_HTML);
  });

  it("does nothing when the same bytes are uploaded again", async () => {
    const { env, store, kv } = await knownArtifact();

    const response = await handleReplaceArtifact(
      EDIT_TOKEN,
      replaceRequest(FIRST_HTML),
      env,
    );
    const body = (await response.json()) as { replaced: boolean };

    expect(body.replaced).toBe(false);
    expect(store.puts).toHaveLength(0);
    expect((await storedMetadata(kv)).previousRevisions).toEqual([]);
  });

  it("refuses a view token", async () => {
    const { env, store } = await knownArtifact();

    const response = await handleReplaceArtifact(
      VIEW_TOKEN,
      replaceRequest(SECOND_HTML),
      env,
    );

    expect(response.status).toBe(403);
    expect(store.puts).toHaveLength(0);
  });

  it("returns 404 for a token that does not exist", async () => {
    const store = recordingArtifactStore();
    const env = await envFor(store.bucket, liveKv());

    const response = await handleReplaceArtifact(
      "f".repeat(32),
      replaceRequest(SECOND_HTML),
      env,
    );

    expect(response.status).toBe(404);
  });

  it("refuses a replacement that is not an HTML document", async () => {
    const { env, store } = await knownArtifact();

    const response = await handleReplaceArtifact(
      EDIT_TOKEN,
      replaceRequest("export const App = () => <div />;"),
      env,
    );

    expect(response.status).toBe(415);
    expect(store.puts).toHaveLength(0);
  });
});
