import { describe, expect, it } from "vitest";
import { getArtifactMetadata } from "@/lib/artifact-metadata";
import { liveKv, testWorkerEnv } from "@/lib/fakes";
import { accessTokenKey, artifactMetadataKey } from "@/lib/storage-keys";
import { handleSetProfile } from "./profile";

const ARTIFACT_ID = "a".repeat(32);
const VIEW_TOKEN = "c".repeat(32);
const EDIT_TOKEN = "d".repeat(32);

function seededKv(): KVNamespace {
  return liveKv([
    {
      key: accessTokenKey(VIEW_TOKEN),
      value: { artifactId: ARTIFACT_ID, kind: "view" },
    },
    {
      key: accessTokenKey(EDIT_TOKEN),
      value: { artifactId: ARTIFACT_ID, kind: "edit" },
    },
    {
      key: artifactMetadataKey(ARTIFACT_ID),
      value: {
        fileName: "deck.html",
        size: 42,
        uploadedAt: "2026-08-01T00:00:00.000Z",
      },
    },
  ]);
}

function patch(profile: unknown): Request {
  return new Request(`https://app.test/api/artifacts/${EDIT_TOKEN}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile }),
  });
}

describe("handleSetProfile", () => {
  it("stores the profile against the artifact", async () => {
    const kv = seededKv();
    const response = await handleSetProfile(
      EDIT_TOKEN,
      patch("pages"),
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    expect(response.status).toBe(200);
    const stored = await getArtifactMetadata(kv, ARTIFACT_ID);
    expect(stored.ok && stored.metadata?.profile).toBe("pages");
  });

  it("keeps the rest of the metadata intact", async () => {
    const kv = seededKv();
    await handleSetProfile(
      EDIT_TOKEN,
      patch("app"),
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    const stored = await getArtifactMetadata(kv, ARTIFACT_ID);
    expect(stored.ok && stored.metadata).toMatchObject({
      fileName: "deck.html",
      size: 42,
    });
  });

  // The profile decides how the deck is divided, so a viewer must not be able
  // to renumber the document for everyone else holding the same link.
  it("refuses a view token", async () => {
    const kv = seededKv();
    const response = await handleSetProfile(
      VIEW_TOKEN,
      patch("pages"),
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    expect(response.status).toBe(403);
    const stored = await getArtifactMetadata(kv, ARTIFACT_ID);
    expect(stored.ok && stored.metadata?.profile).toBeUndefined();
  });

  it("rejects a profile that is not one of the three", async () => {
    const response = await handleSetProfile(
      EDIT_TOKEN,
      patch("cinematic"),
      testWorkerEnv({ ARTIFACT_METADATA: seededKv() }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for a token that does not exist", async () => {
    const response = await handleSetProfile(
      "f".repeat(32),
      patch("pages"),
      testWorkerEnv({ ARTIFACT_METADATA: seededKv() }),
    );

    expect(response.status).toBe(404);
  });
});
