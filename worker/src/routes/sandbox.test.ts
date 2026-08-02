import { describe, expect, it } from "vitest";
import { RUNTIME_SCRIPT_PATH } from "@/lib/artifact-render";
import type { WorkerEnv } from "@/lib/env";
import { stubArtifactStore } from "@/lib/fakes";
import { handleSandboxRequest } from "./sandbox";

const ARTIFACT_ID = "b".repeat(32);
const VALID_HTML = "<!doctype html><html><body>Hi</body></html>";

function envWith(store: R2Bucket): WorkerEnv {
  return { ARTIFACT_STORE: store } as unknown as WorkerEnv;
}

function request(path: string, method = "GET"): Request {
  return new Request(`https://sandbox.test${path}`, { method });
}

describe("handleSandboxRequest", () => {
  it("serves the stored artifact with the runtime script appended", async () => {
    const env = envWith(
      stubArtifactStore([
        {
          artifactId: ARTIFACT_ID,
          bytes: new Uint8Array(new TextEncoder().encode(VALID_HTML)).buffer,
        },
      ]),
    );

    const response = await handleSandboxRequest(
      request(`/${ARTIFACT_ID}`),
      env,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(body.startsWith(VALID_HTML)).toBe(true);
    expect(body).toContain(RUNTIME_SCRIPT_PATH);
  });

  it("returns 404 for an artifact id that does not exist", async () => {
    const response = await handleSandboxRequest(
      request(`/${ARTIFACT_ID}`),
      envWith(stubArtifactStore([])),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed path without touching R2", async () => {
    const response = await handleSandboxRequest(
      request("/not-a-valid-id"),
      envWith(stubArtifactStore([])),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for the runtime script path", async () => {
    const response = await handleSandboxRequest(
      request(RUNTIME_SCRIPT_PATH),
      envWith(stubArtifactStore([])),
    );

    expect(response.status).toBe(404);
  });

  it("rejects non-GET requests", async () => {
    const response = await handleSandboxRequest(
      request(`/${ARTIFACT_ID}`, "POST"),
      envWith(stubArtifactStore([])),
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
      request(`/${ARTIFACT_ID}`),
      envWith(failingStore),
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toMatch(/internal-host-9/);
  });
});
