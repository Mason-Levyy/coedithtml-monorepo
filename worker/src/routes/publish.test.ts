import { describe, expect, it } from "vitest";
import { liveKv, testWorkerEnv } from "@/lib/fakes";
import { artifactMetadataKey } from "@/lib/storage-keys";
import { handlePublishArtifact } from "./publish";

const ARTIFACT_ID = "a".repeat(32);
const OWNER_ID = "b".repeat(32);

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
        published: false,
        draft: true,
      },
    },
  ]);
}

describe("handlePublishArtifact", () => {
  it("publishes draft artifact and mints share tokens", async () => {
    const kv = seededKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
    const request = new Request(
      `https://app.test/api/artifacts/${ARTIFACT_ID}/publish`,
      {
        method: "POST",
        headers: {
          cookie: `coedit_owner=${OWNER_ID}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: "secret-password" }),
      },
    );

    const response = await handlePublishArtifact(ARTIFACT_ID, request, env);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      artifactId: string;
      viewToken: string;
      suggestToken: string;
      editToken: string;
      viewUrl: string;
      published: boolean;
      hasPassword: boolean;
    };

    expect(body.artifactId).toBe(ARTIFACT_ID);
    expect(body.published).toBe(true);
    expect(body.hasPassword).toBe(true);
    expect(body.viewToken).toBeDefined();
    expect(body.suggestToken).toBeDefined();
    expect(body.editToken).toBeDefined();
  });

  it("blocks non-owners from publishing", async () => {
    const kv = seededKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
    const request = new Request(
      `https://app.test/api/artifacts/${ARTIFACT_ID}/publish`,
      {
        method: "POST",
        headers: {
          cookie: `coedit_owner=${"c".repeat(32)}`,
        },
      },
    );

    const response = await handlePublishArtifact(ARTIFACT_ID, request, env);
    expect(response.status).toBe(403);
  });

  it("returns 404 for non-existent artifact", async () => {
    const kv = liveKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
    const request = new Request(
      `https://app.test/api/artifacts/${ARTIFACT_ID}/publish`,
      {
        method: "POST",
        headers: { cookie: `coedit_owner=${OWNER_ID}` },
      },
    );

    const response = await handlePublishArtifact(ARTIFACT_ID, request, env);
    expect(response.status).toBe(404);
  });
});
