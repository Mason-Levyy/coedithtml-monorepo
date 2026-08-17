import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@/lib/env";
import {
  FAKE_APP_HOST,
  liveKv,
  mergeKv,
  stubAccessTokens,
  failingKv,
  stubArtifactMetadata,
  testWorkerEnv,
} from "@/lib/fakes";
import { hashArtifactPassword } from "@/lib/password";
import { mintUnlockGrant } from "@/lib/unlock-grants";
import { handleGetArtifact } from "./artifact";

const ARTIFACT_ID = "a".repeat(32);
const VIEW_TOKEN = "c".repeat(32);
const METADATA = {
  fileName: "deck.html",
  size: 42,
  uploadedAt: "2026-08-01T00:00:00.000Z",
  revision: "9f2c1a04b7e35d68",
};

function envWith(kv: KVNamespace): WorkerEnv {
  return testWorkerEnv({ ARTIFACT_METADATA: kv });
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

  it("returns markdown when requested with Accept: text/markdown", async () => {
    const markdownReq = new Request(
      `https://app.test/api/artifacts/${VIEW_TOKEN}`,
      { headers: { accept: "text/markdown" } },
    );
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      markdownReq,
      envFor(METADATA),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("x-markdown-tokens")).toBeTruthy();
    const text = await response.text();
    expect(text).toContain("# Artifact: deck.html");
    expect(text).toContain("- **Size**: 42 bytes");
  });

  it("falls back to just its own link when the token predates sibling tokens", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(),
      envFor(METADATA),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.shareLinks).toEqual({
      view: `https://${FAKE_APP_HOST}/a/${VIEW_TOKEN}`,
    });
  });

  it("offers only links at or below an edit token's own permission", async () => {
    const suggestToken = "d".repeat(32);
    const editToken = "e".repeat(32);
    const siblingTokens = {
      view: VIEW_TOKEN,
      suggest: suggestToken,
      edit: editToken,
    };
    const env = envWith(
      mergeKv(
        stubAccessTokens([
          {
            token: editToken,
            record: { artifactId: ARTIFACT_ID, kind: "edit", siblingTokens },
          },
        ]),
        stubArtifactMetadata([{ artifactId: ARTIFACT_ID, metadata: METADATA }]),
      ),
    );

    const response = await handleGetArtifact(
      editToken,
      new Request(`https://app.test/api/artifacts/${editToken}`),
      env,
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.shareLinks).toEqual({
      view: `https://${FAKE_APP_HOST}/a/${VIEW_TOKEN}`,
      suggest: `https://${FAKE_APP_HOST}/a/${suggestToken}`,
      edit: `https://${FAKE_APP_HOST}/a/${editToken}`,
    });
  });

  it("never includes the password hash in the response", async () => {
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(),
      envFor(METADATA),
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
    const response = await handleGetArtifact(
      VIEW_TOKEN,
      request(),
      envWith(failingKv("KV connection reset at internal-host-9")),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toMatch(/internal-host-9/);
  });

  describe("password gate", () => {
    async function envWithPassword(password: string): Promise<WorkerEnv> {
      return envFor({
        ...METADATA,
        passwordHash: await hashArtifactPassword(password),
      });
    }

    it("reports that a password is needed, without leaking the file name", async () => {
      const response = await handleGetArtifact(
        VIEW_TOKEN,
        request(),
        await envWithPassword("hunter2"),
      );
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body).toEqual({ requiresPassword: true });
    });

    it("returns locked markdown when requested with Accept: text/markdown", async () => {
      const markdownReq = new Request(
        `https://app.test/api/artifacts/${VIEW_TOKEN}`,
        { headers: { accept: "text/markdown" } },
      );
      const response = await handleGetArtifact(
        VIEW_TOKEN,
        markdownReq,
        await envWithPassword("hunter2"),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/markdown");
      const text = await response.text();
      expect(text).toContain("# Artifact Locked");
    });

    it("serves the metadata once a grant for this artifact is presented", async () => {
      const kv = mergeKv(
        stubAccessTokens([
          {
            token: VIEW_TOKEN,
            record: { artifactId: ARTIFACT_ID, kind: "view" },
          },
        ]),
        stubArtifactMetadata([
          {
            artifactId: ARTIFACT_ID,
            metadata: {
              ...METADATA,
              passwordHash: await hashArtifactPassword("hunter2"),
            },
          },
        ]),
        liveKv(),
      );
      const minted = await mintUnlockGrant(kv, ARTIFACT_ID);
      if (!minted.ok) throw new Error("expected a grant");

      const response = await handleGetArtifact(
        VIEW_TOKEN,
        request(`?u=${minted.grant}`),
        envWith(kv),
      );
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body).toMatchObject({ fileName: "deck.html" });
    });

    it("refuses a grant that was never issued", async () => {
      const response = await handleGetArtifact(
        VIEW_TOKEN,
        request(`?u=${"f".repeat(32)}`),
        await envWithPassword("hunter2"),
      );
      const body = (await response.json()) as Record<string, unknown>;

      expect(body).toEqual({ requiresPassword: true });
    });
  });
});
