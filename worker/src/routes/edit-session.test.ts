import { addEntryMessage, removeEntryMessage } from "@coedithtml/protocol";
import type { EditEntry, OverlayEntry } from "@coedithtml/protocol";
import { describe, expect, it } from "vitest";
import { runtimeScriptPath } from "@/lib/artifact-render";
import type { WorkerEnv } from "@/lib/env";
import {
  liveArtifactStore,
  liveKv,
  memoryEntryStore,
  stubAssets,
  testWorkerEnv,
} from "@/lib/fakes";
import { applyClientMessage } from "@/lib/overlay-log";
import { objectKeyFor } from "@/lib/artifact-store";
import { handleSandboxRequest } from "./sandbox";
import { handleUpload } from "./upload";

const AWKWARD_HTML = [
  "<!DOCTYPE html>",
  "<html lang='en'>",
  "<BODY>",
  "\t<p>Revenue grew 18% this quarter.",
  "\t<p>Margins held at 42%.",
  "\t<script>const closing = '</html>'; console.log(closing);</script>",
  "</BODY>",
  "</html>",
  "",
].join("\n");

function envWith(store: R2Bucket, kv: KVNamespace): WorkerEnv {
  return testWorkerEnv({
    ARTIFACT_STORE: store,
    ARTIFACT_METADATA: kv,
    ASSETS: stubAssets([]),
  });
}

async function uploadArtifact(env: WorkerEnv) {
  const form = new FormData();
  form.append(
    "file",
    new File([AWKWARD_HTML], "deck.html", {
      type: "text/html",
    }),
  );
  const response = await handleUpload(
    new Request("https://app.test/api/artifacts", {
      method: "POST",
      body: form,
    }),
    env,
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as {
    artifactId: string;
    editToken: string;
    viewToken: string;
  };
  return body;
}

function edit(quote: string, body: string, id: string): EditEntry {
  return {
    kind: "edit",
    id,
    parentId: null,
    anchor: {
      kind: "text",
      quote,
      prefix: "",
      suffix: "",
      path: "p[1]",
      revision: "r1",
    },
    body,
    author: { id: "reader-1", displayName: "Priya", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    rev: 0,
    createdAt: "2026-08-14T12:00:00.000Z",
  };
}

function runEditingSession(seed: OverlayEntry[] = []) {
  const store = memoryEntryStore(seed);
  const session = { now: "2026-08-14T12:00:00.000Z", canEdit: true };

  applyClientMessage(
    store,
    addEntryMessage(edit("grew 18", "fell 4", "e1")),
    session,
  );
  applyClientMessage(
    store,
    addEntryMessage(edit("held at 42", "slipped to 31", "e2")),
    session,
  );
  applyClientMessage(
    store,
    addEntryMessage(edit("fell 4", "recovered", "e3")),
    session,
  );
  applyClientMessage(store, removeEntryMessage("e2"), session);

  return store;
}

async function bytesIn(store: R2Bucket, key: string): Promise<ArrayBuffer> {
  const object = await store.get(key);
  if (object === null) {
    throw new Error(`nothing stored at ${key}`);
  }
  return object.arrayBuffer();
}

type StoredMetadata = {
  revision: string;
  blobs: Record<string, string>;
  ownerId?: string;
};

function asText(bytes: ArrayBuffer): string {
  return new TextDecoder().decode(bytes);
}

describe("the stored artifact across an editing session", () => {
  it("is byte-for-byte what was uploaded, before and after every edit", async () => {
    const store = liveArtifactStore();
    const kv = liveKv();
    const env = envWith(store, kv);

    const { artifactId } = await uploadArtifact(env);
    const metadata = JSON.parse(
      (await kv.get(`artifacts/${artifactId}`)) ?? "{}",
    ) as StoredMetadata;
    const key = objectKeyFor(artifactId, metadata.revision, metadata);

    const uploaded = await bytesIn(store, key);
    expect(asText(uploaded)).toBe(AWKWARD_HTML);

    runEditingSession();

    const afterEditing = await bytesIn(store, key);
    expect(new Uint8Array(afterEditing)).toEqual(new Uint8Array(uploaded));
    expect(asText(afterEditing)).toBe(AWKWARD_HTML);
  });

  it("keeps every edit in the overlay and none of it in the file", async () => {
    const store = liveArtifactStore();
    const kv = liveKv();
    const env = envWith(store, kv);

    const { artifactId } = await uploadArtifact(env);
    const metadata = JSON.parse(
      (await kv.get(`artifacts/${artifactId}`)) ?? "{}",
    ) as StoredMetadata;

    const log = runEditingSession();
    const kinds = log.list().map((entry) => entry.kind);
    expect(kinds).toEqual(["edit", "edit"]);

    const served = asText(
      await bytesIn(
        store,
        objectKeyFor(artifactId, metadata.revision, metadata),
      ),
    );
    expect(served).not.toContain("fell 4");
    expect(served).not.toContain("recovered");
    expect(served).toContain("Revenue grew 18% this quarter.");
  });

  it("serves the original bytes with exactly one script appended", async () => {
    const store = liveArtifactStore();
    const kv = liveKv();
    const env = envWith(store, kv);

    const { artifactId, viewToken } = await uploadArtifact(env);
    const metadata = JSON.parse(
      (await kv.get(`artifacts/${artifactId}`)) ?? "{}",
    ) as { revision: string };

    runEditingSession();

    const response = await handleSandboxRequest(
      new Request(`https://sandbox.test/${viewToken}`),
      env,
    );
    expect(response.status).toBe(200);

    const body = await response.text();
    const appended = `\n<script src="${runtimeScriptPath(metadata.revision)}" defer></script>\n`;

    expect(body.startsWith(AWKWARD_HTML)).toBe(true);
    expect(body.slice(0, AWKWARD_HTML.length)).toBe(AWKWARD_HTML);
    expect(body.slice(AWKWARD_HTML.length)).toBe(appended);
    expect(body.split("<script src=").length - 1).toBe(1);
  });
});

describe("what an editing session may not do", () => {
  it("refuses an edit from a link that may only comment", () => {
    const store = memoryEntryStore();

    const outcome = applyClientMessage(
      store,
      addEntryMessage(edit("grew 18", "fell 4", "e1")),
      { now: "2026-08-14T12:00:00.000Z", canEdit: false },
    );

    expect(outcome).toEqual({ ok: false, reason: "not-editable", id: "e1" });
    expect(store.list()).toEqual([]);
  });
});
