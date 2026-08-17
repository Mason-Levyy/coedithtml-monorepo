import { describe, expect, it } from "vitest";
import { resolveAccessToken } from "@/lib/access-tokens";
import { getArtifactMetadata } from "@/lib/artifact-metadata";
import { liveKv, testWorkerEnv } from "@/lib/fakes";
import { addOwnerArtifact, listOwnerArtifacts } from "@/lib/owner-artifacts";
import { artifactMetadataKey } from "@/lib/storage-keys";
import { handleRegenerateLink } from "./regenerate-link";

const ARTIFACT_ID = "a".repeat(32);
const OWNER_ID = "b".repeat(32);
const VIEW_TOKEN = "c".repeat(32);

function seededKv(ownerId = OWNER_ID): KVNamespace {
  return liveKv([
    {
      key: artifactMetadataKey(ARTIFACT_ID),
      value: {
        fileName: "test.html",
        size: 100,
        uploadedAt: "2026-08-01T00:00:00.000Z",
        revision: "rev1",
        ownerId,
        published: true,
        tokens: { viewToken: VIEW_TOKEN },
      },
    },
  ]);
}

function request(kind: string, ownerId = OWNER_ID): Request {
  return new Request(
    `https://app.test/api/artifacts/${ARTIFACT_ID}/links/${kind}/regenerate`,
    { method: "POST", headers: { cookie: `__Host-coedit_owner=${ownerId}` } },
  );
}

describe("handleRegenerateLink", () => {
  it("mints a fresh view token and revokes the old one", async () => {
    const kv = seededKv();
    await addOwnerArtifact(kv, OWNER_ID, {
      artifactId: ARTIFACT_ID,
      fileName: "test.html",
      size: 100,
      uploadedAt: new Date().toISOString(),
      published: true,
      hasPassword: false,
      viewToken: VIEW_TOKEN,
    });

    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
    const response = await handleRegenerateLink(
      ARTIFACT_ID,
      "view",
      request("view"),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      kind: string;
      token: string;
      url: string;
    };
    expect(body.kind).toBe("view");
    expect(body.token).not.toBe(VIEW_TOKEN);

    const oldResolved = await resolveAccessToken(kv, VIEW_TOKEN);
    expect(oldResolved.ok && oldResolved.record).toBeNull();

    const meta = await getArtifactMetadata(kv, ARTIFACT_ID);
    expect(meta.ok && meta.metadata?.tokens?.viewToken).toBe(body.token);

    const owned = await listOwnerArtifacts(kv, OWNER_ID);
    expect(owned[0]?.viewToken).toBe(body.token);
  });

  it("mints a link for a kind that had none yet", async () => {
    const kv = seededKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });

    const response = await handleRegenerateLink(
      ARTIFACT_ID,
      "edit",
      request("edit"),
      env,
    );
    expect(response.status).toBe(200);

    const meta = await getArtifactMetadata(kv, ARTIFACT_ID);
    expect(meta.ok && meta.metadata?.tokens?.editToken).toBeDefined();
  });

  it("blocks non-owners from regenerating a link", async () => {
    const kv = seededKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });

    const response = await handleRegenerateLink(
      ARTIFACT_ID,
      "view",
      request("view", "d".repeat(32)),
      env,
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 for an unknown artifact", async () => {
    const kv = liveKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });

    const response = await handleRegenerateLink(
      ARTIFACT_ID,
      "view",
      request("view"),
      env,
    );
    expect(response.status).toBe(404);
  });
});
