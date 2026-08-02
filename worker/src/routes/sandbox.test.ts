import { describe, expect, it } from "vitest";
import { RUNTIME_SCRIPT_PATH } from "@/lib/artifact-render";
import type { WorkerEnv } from "@/lib/env";
import {
  FAKE_APP_HOST,
  stubAccessTokens,
  stubArtifactStore,
} from "@/lib/fakes";
import { handleSandboxRequest } from "./sandbox";

const ARTIFACT_ID = "b".repeat(32);
const VIEW_TOKEN = "d".repeat(32);
const VALID_HTML = "<!doctype html><html><body>Hi</body></html>";

function envWith(store: R2Bucket, tokens: KVNamespace): WorkerEnv {
  return {
    ARTIFACT_STORE: store,
    ARTIFACT_METADATA: tokens,
    APP_HOST: FAKE_APP_HOST,
  } as unknown as WorkerEnv;
}

function knownArtifactEnv(): WorkerEnv {
  return envWith(
    stubArtifactStore([
      {
        artifactId: ARTIFACT_ID,
        bytes: new Uint8Array(new TextEncoder().encode(VALID_HTML)).buffer,
      },
    ]),
    stubAccessTokens([
      { token: VIEW_TOKEN, record: { artifactId: ARTIFACT_ID, kind: "view" } },
    ]),
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
      envWith(stubArtifactStore([]), stubAccessTokens([])),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed path without touching storage", async () => {
    const response = await handleSandboxRequest(
      request("/not-a-valid-token"),
      envWith(stubArtifactStore([]), stubAccessTokens([])),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for the runtime script path", async () => {
    const response = await handleSandboxRequest(
      request(RUNTIME_SCRIPT_PATH),
      envWith(stubArtifactStore([]), stubAccessTokens([])),
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
        stubAccessTokens([
          {
            token: VIEW_TOKEN,
            record: { artifactId: ARTIFACT_ID, kind: "view" },
          },
        ]),
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toMatch(/internal-host-9/);
  });
});
