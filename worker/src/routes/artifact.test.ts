import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@/lib/env";
import { mergeKv, stubAccessTokens, stubArtifactMetadata } from "@/lib/fakes";
import { handleGetArtifact } from "./artifact";

const ARTIFACT_ID = "a".repeat(32);
const VIEW_TOKEN = "c".repeat(32);
const METADATA = {
  fileName: "deck.html",
  size: 42,
  uploadedAt: "2026-08-01T00:00:00.000Z",
};

function envWith(kv: KVNamespace): WorkerEnv {
  return { ARTIFACT_METADATA: kv } as unknown as WorkerEnv;
}

function knownArtifactEnv(): WorkerEnv {
  return envWith(
    mergeKv(
      stubAccessTokens([
        {
          token: VIEW_TOKEN,
          record: { artifactId: ARTIFACT_ID, kind: "view" },
        },
      ]),
      stubArtifactMetadata([{ artifactId: ARTIFACT_ID, metadata: METADATA }]),
    ),
  );
}

describe("handleGetArtifact", () => {
  it("returns the stored metadata for a known view token", async () => {
    const response = await handleGetArtifact(VIEW_TOKEN, knownArtifactEnv());
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      artifactId: ARTIFACT_ID,
      fileName: "deck.html",
      size: 42,
    });
  });

  it("returns 404 for a token that does not exist", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      envWith(mergeKv(stubAccessTokens([]), stubArtifactMetadata([]))),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed token without touching KV", async () => {
    const response = await handleGetArtifact(
      "not-a-valid-token",
      envWith(mergeKv(stubAccessTokens([]), stubArtifactMetadata([]))),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the token resolves but the metadata is gone", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      envWith(
        mergeKv(
          stubAccessTokens([
            {
              token: VIEW_TOKEN,
              record: { artifactId: ARTIFACT_ID, kind: "view" },
            },
          ]),
          stubArtifactMetadata([]),
        ),
      ),
    );

    expect(response.status).toBe(404);
  });

  it("reports a token resolution failure without leaking the cause", async () => {
    const failingKv = {
      get: () => {
        throw new Error("KV connection reset at internal-host-9");
      },
    } as unknown as KVNamespace;

    const response = await handleGetArtifact(VIEW_TOKEN, envWith(failingKv));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toMatch(/internal-host-9/);
  });
});
