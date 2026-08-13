import { describe, expect, it } from "vitest";
import { resolveAccessToken } from "@/lib/access-tokens";
import { liveKv, testWorkerEnv } from "@/lib/fakes";
import { accessTokenKey, artifactMetadataKey } from "@/lib/storage-keys";
import { handleRevokeToken } from "./revoke";

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

describe("handleRevokeToken", () => {
  it("revokes the named token", async () => {
    const kv = seededKv();
    const response = await handleRevokeToken(
      VIEW_TOKEN,
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    expect(response.status).toBe(200);
    const resolved = await resolveAccessToken(kv, VIEW_TOKEN);
    expect(resolved.ok && resolved.record).toBeNull();
  });

  it("leaves the artifact's other token working", async () => {
    const kv = seededKv();
    await handleRevokeToken(
      VIEW_TOKEN,
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    const resolved = await resolveAccessToken(kv, EDIT_TOKEN);
    expect(resolved.ok && resolved.record).toMatchObject({ kind: "edit" });
  });

  it("returns 404 for a token that does not exist", async () => {
    const response = await handleRevokeToken(
      "f".repeat(32),
      testWorkerEnv({ ARTIFACT_METADATA: seededKv() }),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed token", async () => {
    const response = await handleRevokeToken(
      "not-a-token",
      testWorkerEnv({ ARTIFACT_METADATA: seededKv() }),
    );

    expect(response.status).toBe(404);
  });
});
