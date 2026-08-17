import { describe, expect, it } from "vitest";
import { stubArtifactStore, liveKv, testWorkerEnv } from "@/lib/fakes";
import { getArtifactMetadata } from "@/lib/artifact-metadata";
import { addOwnerArtifact, listOwnerArtifacts } from "@/lib/owner-artifacts";
import { artifactMetadataKey } from "@/lib/storage-keys";
import {
  handleDeleteArtifact,
  handleUpdateArtifactSettings,
} from "./artifact-settings";

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
        published: true,
      },
    },
  ]);
}

describe("artifact-settings", () => {
  describe("handleUpdateArtifactSettings", () => {
    it("updates password when requested by owner", async () => {
      const kv = seededKv();
      await addOwnerArtifact(kv, OWNER_ID, {
        artifactId: ARTIFACT_ID,
        fileName: "test.html",
        size: 100,
        uploadedAt: new Date().toISOString(),
        published: true,
        hasPassword: false,
      });

      const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
      const request = new Request(
        `https://app.test/api/artifacts/${ARTIFACT_ID}/settings`,
        {
          method: "PATCH",
          headers: {
            cookie: `__Host-coedit_owner=${OWNER_ID}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ password: "new-password" }),
        },
      );

      const response = await handleUpdateArtifactSettings(
        ARTIFACT_ID,
        request,
        env,
      );
      expect(response.status).toBe(200);

      const meta = await getArtifactMetadata(kv, ARTIFACT_ID);
      expect(meta.ok && meta.metadata?.passwordHash).toBeDefined();

      const owned = await listOwnerArtifacts(kv, OWNER_ID);
      expect(owned[0]?.hasPassword).toBe(true);
    });

    it("clears password when set to empty string", async () => {
      const kv = seededKv();
      const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
      const request = new Request(
        `https://app.test/api/artifacts/${ARTIFACT_ID}/settings`,
        {
          method: "PATCH",
          headers: {
            cookie: `__Host-coedit_owner=${OWNER_ID}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ password: "" }),
        },
      );

      const response = await handleUpdateArtifactSettings(
        ARTIFACT_ID,
        request,
        env,
      );
      expect(response.status).toBe(200);

      const meta = await getArtifactMetadata(kv, ARTIFACT_ID);
      expect(meta.ok && meta.metadata?.passwordHash).toBeUndefined();
    });

    it("blocks non-owners from updating settings", async () => {
      const kv = seededKv();
      const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
      const request = new Request(
        `https://app.test/api/artifacts/${ARTIFACT_ID}/settings`,
        {
          method: "PATCH",
          headers: { cookie: `__Host-coedit_owner=${"c".repeat(32)}` },
          body: JSON.stringify({ password: "test" }),
        },
      );

      const response = await handleUpdateArtifactSettings(
        ARTIFACT_ID,
        request,
        env,
      );
      expect(response.status).toBe(403);
    });
  });

  describe("handleDeleteArtifact", () => {
    it("deletes metadata, storage revisions, and owner entry", async () => {
      const kv = seededKv();
      const bucket = stubArtifactStore([]);
      await addOwnerArtifact(kv, OWNER_ID, {
        artifactId: ARTIFACT_ID,
        fileName: "test.html",
        size: 100,
        uploadedAt: new Date().toISOString(),
        published: true,
        hasPassword: false,
      });

      const env = testWorkerEnv({
        ARTIFACT_METADATA: kv,
        ARTIFACT_STORE: bucket,
      });
      const request = new Request(
        `https://app.test/api/my-artifacts/${ARTIFACT_ID}`,
        {
          method: "DELETE",
          headers: { cookie: `__Host-coedit_owner=${OWNER_ID}` },
        },
      );

      const response = await handleDeleteArtifact(ARTIFACT_ID, request, env);
      expect(response.status).toBe(200);

      const meta = await getArtifactMetadata(kv, ARTIFACT_ID);
      expect(meta.ok && meta.metadata).toBeNull();

      const owned = await listOwnerArtifacts(kv, OWNER_ID);
      expect(owned).toHaveLength(0);
    });

    it("blocks non-owners from deleting artifact", async () => {
      const kv = seededKv();
      const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
      const request = new Request(
        `https://app.test/api/artifacts/${ARTIFACT_ID}`,
        {
          method: "DELETE",
          headers: { cookie: `__Host-coedit_owner=${"c".repeat(32)}` },
        },
      );

      const response = await handleDeleteArtifact(ARTIFACT_ID, request, env);
      expect(response.status).toBe(403);
    });
  });
});
