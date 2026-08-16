import { describe, expect, it } from "vitest";
import { resolveAccessToken } from "@/lib/access-tokens";
import { liveKv, testWorkerEnv } from "@/lib/fakes";
import { accessTokenKey, artifactMetadataKey } from "@/lib/storage-keys";
import { handleRevokeToken } from "./revoke";

const ARTIFACT_ID = "a".repeat(32);
const VIEW_TOKEN = "c".repeat(32);
const EDIT_TOKEN = "d".repeat(32);
const OWNER_ID = "e".repeat(32);

function seededKv(ownerId?: string): KVNamespace {
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
        revision: "9f2c1a04b7e35d68",
        ownerId,
      },
    },
  ]);
}

describe("handleRevokeToken", () => {
  it("revokes the named token when owner matches", async () => {
    const kv = seededKv(OWNER_ID);
    const request = new Request(
      "https://app.test/api/artifacts/" + VIEW_TOKEN,
      {
        headers: { cookie: `coedit_owner=${OWNER_ID}` },
      },
    );
    const response = await handleRevokeToken(
      VIEW_TOKEN,
      request,
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    expect(response.status).toBe(200);
    const resolved = await resolveAccessToken(kv, VIEW_TOKEN);
    expect(resolved.ok && resolved.record).toBeNull();
  });

  it("blocks non-owner from revoking when ownerId is set", async () => {
    const kv = seededKv(OWNER_ID);
    const request = new Request(
      "https://app.test/api/artifacts/" + VIEW_TOKEN,
      {
        headers: { cookie: "coedit_owner=different-owner0000000000000000" },
      },
    );
    const response = await handleRevokeToken(
      VIEW_TOKEN,
      request,
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    expect(response.status).toBe(403);
    const resolved = await resolveAccessToken(kv, VIEW_TOKEN);
    expect(resolved.ok && resolved.record).not.toBeNull();
  });

  it("leaves the artifact's other token working", async () => {
    const kv = seededKv(OWNER_ID);
    const request = new Request(
      "https://app.test/api/artifacts/" + VIEW_TOKEN,
      {
        headers: { cookie: `coedit_owner=${OWNER_ID}` },
      },
    );
    await handleRevokeToken(
      VIEW_TOKEN,
      request,
      testWorkerEnv({ ARTIFACT_METADATA: kv }),
    );

    const resolved = await resolveAccessToken(kv, EDIT_TOKEN);
    expect(resolved.ok && resolved.record).toMatchObject({ kind: "edit" });
  });

  it("returns 404 for a token that does not exist", async () => {
    const request = new Request(
      "https://app.test/api/artifacts/" + "f".repeat(32),
    );
    const response = await handleRevokeToken(
      "f".repeat(32),
      request,
      testWorkerEnv({ ARTIFACT_METADATA: seededKv() }),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed token", async () => {
    const request = new Request("https://app.test/api/artifacts/not-a-token");
    const response = await handleRevokeToken(
      "not-a-token",
      request,
      testWorkerEnv({ ARTIFACT_METADATA: seededKv() }),
    );

    expect(response.status).toBe(404);
  });
});
