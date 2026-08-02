import { describe, expect, it } from "vitest";
import { RUNTIME_SCRIPT_PATH } from "@/lib/artifact-render";
import type { WorkerEnv } from "@/lib/env";
import {
  FAKE_APP_HOST,
  liveKv,
  mergeKv,
  stubAccessTokens,
  stubArtifactMetadata,
  stubArtifactStore,
} from "@/lib/fakes";
import { hashArtifactPassword } from "@/lib/password";
import { accessTokenKey, artifactMetadataKey } from "@/lib/storage-keys";
import { handleSandboxRequest } from "./sandbox";

const ARTIFACT_ID = "b".repeat(32);
const VIEW_TOKEN = "d".repeat(32);
const VALID_HTML = "<!doctype html><html><body>Hi</body></html>";
const METADATA = {
  fileName: "deck.html",
  size: VALID_HTML.length,
  uploadedAt: "2026-08-01T00:00:00.000Z",
};

function envWith(store: R2Bucket, kv: KVNamespace): WorkerEnv {
  return {
    ARTIFACT_STORE: store,
    ARTIFACT_METADATA: kv,
    APP_HOST: FAKE_APP_HOST,
  } as unknown as WorkerEnv;
}

function knownArtifactEnv(metadata: unknown = METADATA): WorkerEnv {
  return envWith(
    stubArtifactStore([
      {
        artifactId: ARTIFACT_ID,
        bytes: new Uint8Array(new TextEncoder().encode(VALID_HTML)).buffer,
      },
    ]),
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

function request(path: string, method = "GET"): Request {
  return new Request(`https://sandbox.test${path}`, { method });
}

describe("handleSandboxRequest", () => {
  it("serves the stored artifact with the runtime script appended", async () => {
    const response = await handleSandboxRequest(
      request(`/${VIEW_TOKEN}`),
      knownArtifactEnv(),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(body.startsWith(VALID_HTML)).toBe(true);
    expect(body).toContain(RUNTIME_SCRIPT_PATH);
  });

  it("sets a frame-ancestors CSP allowing only the app origin", async () => {
    const response = await handleSandboxRequest(
      request(`/${VIEW_TOKEN}`),
      knownArtifactEnv(),
    );

    expect(response.headers.get("content-security-policy")).toContain(
      `frame-ancestors ${FAKE_APP_HOST}`,
    );
  });

  it("returns 404 for a token that does not exist", async () => {
    const response = await handleSandboxRequest(
      request(`/${VIEW_TOKEN}`),
      envWith(stubArtifactStore([]), mergeKv(stubAccessTokens([]))),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed path without touching storage", async () => {
    const response = await handleSandboxRequest(
      request("/not-a-valid-token"),
      envWith(stubArtifactStore([]), mergeKv(stubAccessTokens([]))),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for the runtime script path", async () => {
    const response = await handleSandboxRequest(
      request(RUNTIME_SCRIPT_PATH),
      envWith(stubArtifactStore([]), mergeKv(stubAccessTokens([]))),
    );

    expect(response.status).toBe(404);
  });

  it("rejects non-GET requests", async () => {
    const response = await handleSandboxRequest(
      request(`/${VIEW_TOKEN}`, "POST"),
      knownArtifactEnv(),
    );

    expect(response.status).toBe(405);
  });

  it("reports a storage failure without leaking the cause", async () => {
    const failingStore = {
      get: () => {
        throw new Error("R2 connection reset at internal-host-9");
      },
    } as unknown as R2Bucket;

    const response = await handleSandboxRequest(
      request(`/${VIEW_TOKEN}`),
      envWith(
        failingStore,
        mergeKv(
          stubAccessTokens([
            {
              token: VIEW_TOKEN,
              record: { artifactId: ARTIFACT_ID, kind: "view" },
            },
          ]),
          stubArtifactMetadata([
            { artifactId: ARTIFACT_ID, metadata: METADATA },
          ]),
        ),
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toMatch(/internal-host-9/);
  });

  describe("password gate", () => {
    async function envWithPassword(password: string): Promise<WorkerEnv> {
      return knownArtifactEnv({
        ...METADATA,
        passwordHash: await hashArtifactPassword(ARTIFACT_ID, password),
      });
    }

    it("requires a password when the artifact has one set", async () => {
      const response = await handleSandboxRequest(
        request(`/${VIEW_TOKEN}`),
        await envWithPassword("hunter2"),
      );

      expect(response.status).toBe(401);
    });

    it("accepts the correct password as a query parameter", async () => {
      const response = await handleSandboxRequest(
        request(`/${VIEW_TOKEN}?password=hunter2`),
        await envWithPassword("hunter2"),
      );

      expect(response.status).toBe(200);
    });

    it("rejects an incorrect password", async () => {
      const response = await handleSandboxRequest(
        request(`/${VIEW_TOKEN}?password=wrong`),
        await envWithPassword("hunter2"),
      );

      expect(response.status).toBe(401);
    });

    it("rate-limits repeated incorrect attempts", async () => {
      const passwordHash = await hashArtifactPassword(ARTIFACT_ID, "hunter2");
      const env = envWith(
        stubArtifactStore([
          {
            artifactId: ARTIFACT_ID,
            bytes: new Uint8Array(new TextEncoder().encode(VALID_HTML)).buffer,
          },
        ]),
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
        last = await handleSandboxRequest(
          request(`/${VIEW_TOKEN}?password=wrong`),
          env,
        );
      }

      expect(last?.status).toBe(429);
    });
  });
});
