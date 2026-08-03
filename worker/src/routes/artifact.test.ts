import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@/lib/env";
import {
  liveKv,
  mergeKv,
  stubAccessTokens,
  stubArtifactMetadata,
} from "@/lib/fakes";
import { hashArtifactPassword } from "@/lib/password";
import { accessTokenKey, artifactMetadataKey } from "@/lib/storage-keys";
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

function envFor(metadata: unknown): WorkerEnv {
  return envWith(
    mergeKv(
      stubAccessTokens([
        {
          token: VIEW_TOKEN,
          record: { artifactId: ARTIFACT_ID, kind: "view" },
        },
      ]),
      stubArtifactMetadata([{ artifactId: ARTIFACT_ID, metadata }]),
    ),
  );
}

function request(query = ""): Request {
  return new Request(`https://app.test/api/artifacts/${VIEW_TOKEN}${query}`);
}

describe("handleGetArtifact", () => {
  it("returns the stored metadata for a known view token", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(),
      envFor(METADATA),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      artifactId: ARTIFACT_ID,
      fileName: "deck.html",
      size: 42,
    });
  });

  it("never includes the password hash in the response", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(`?password=${encodeURIComponent("hunter2")}`),
      envFor({
        ...METADATA,
        passwordHash: await hashArtifactPassword(ARTIFACT_ID, "hunter2"),
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.passwordHash).toBeUndefined();
  });

  it("returns 404 for a token that does not exist", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(),
      envWith(mergeKv(stubAccessTokens([]), stubArtifactMetadata([]))),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed token without touching KV", async () => {
    const response = await handleGetArtifact(
      "not-a-valid-token",
      request(),
      envWith(mergeKv(stubAccessTokens([]), stubArtifactMetadata([]))),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the token resolves but the metadata is gone", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(),
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

    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(),
      envWith(failingKv),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toMatch(/internal-host-9/);
  });

  describe("password gate", () => {
    async function envWithPassword(password: string): Promise<WorkerEnv> {
      return envFor({
        ...METADATA,
        passwordHash: await hashArtifactPassword(ARTIFACT_ID, password),
      });
    }

    it("requires a password when the artifact has one set", async () => {
      const response = await handleGetArtifact(
        VIEW_TOKEN,
        request(),
        await envWithPassword("hunter2"),
      );
      const body = (await response.json()) as { error?: string };

      expect(response.status).toBe(401);
      expect(body.error).toBe("Password required.");
    });

    it("accepts the correct password", async () => {
      const response = await handleGetArtifact(
        VIEW_TOKEN,
        request(`?password=${encodeURIComponent("hunter2")}`),
        await envWithPassword("hunter2"),
      );

      expect(response.status).toBe(200);
    });

    it("rejects an incorrect password", async () => {
      const response = await handleGetArtifact(
        VIEW_TOKEN,
        request("?password=wrong"),
        await envWithPassword("hunter2"),
      );
      const body = (await response.json()) as { error?: string };

      expect(response.status).toBe(401);
      expect(body.error).toBe("Incorrect password.");
    });

    it("rate-limits repeated incorrect attempts", async () => {
      const passwordHash = await hashArtifactPassword(ARTIFACT_ID, "hunter2");
      const env = envWith(
        liveKv([
          {
            key: accessTokenKey(VIEW_TOKEN),
            value: { artifactId: ARTIFACT_ID, kind: "view" },
          },
          {
            key: artifactMetadataKey(ARTIFACT_ID),
            value: { ...METADATA, passwordHash },
          },
        ]),
      );

      let last: Response | undefined;
      for (let attempt = 0; attempt < 11; attempt += 1) {
        last = await handleGetArtifact(
          VIEW_TOKEN,
          request("?password=wrong"),
          env,
        );
      }

      expect(last?.status).toBe(429);
    });
  });
});
