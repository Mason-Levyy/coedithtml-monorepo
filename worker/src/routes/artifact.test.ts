import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@/lib/env";
import { stubArtifactMetadata } from "@/lib/fakes";
import { handleGetArtifact } from "./artifact";

const ARTIFACT_ID = "a".repeat(32);

function envWith(kv: ReturnType<typeof stubArtifactMetadata>): WorkerEnv {
  return { ARTIFACT_METADATA: kv } as unknown as WorkerEnv;
}

describe("handleGetArtifact", () => {
  it("returns the stored metadata for a known artifact", async () => {
    const env = envWith(
      stubArtifactMetadata([
        {
          artifactId: ARTIFACT_ID,
          metadata: {
            fileName: "deck.html",
            size: 42,
            uploadedAt: "2026-08-01T00:00:00.000Z",
          },
        },
      ]),
    );

    const response = await handleGetArtifact(ARTIFACT_ID, env);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      artifactId: ARTIFACT_ID,
      fileName: "deck.html",
      size: 42,
    });
  });

  it("returns 404 for an artifact id that does not exist", async () => {
    const response = await handleGetArtifact(
      ARTIFACT_ID,
      envWith(stubArtifactMetadata([])),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed artifact id without touching KV", async () => {
    const response = await handleGetArtifact(
      "not-a-valid-id",
      envWith(stubArtifactMetadata([])),
    );

    expect(response.status).toBe(404);
  });

  it("reports a metadata read failure without leaking the cause", async () => {
    const failingKv = {
      get: () => {
        throw new Error("KV connection reset at internal-host-9");
      },
    } as unknown as KVNamespace;

    const response = await handleGetArtifact(ARTIFACT_ID, envWith(failingKv));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toMatch(/internal-host-9/);
  });
});
