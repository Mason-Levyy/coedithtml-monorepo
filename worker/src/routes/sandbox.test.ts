import { describe, expect, it } from "vitest";
import { RUNTIME_SCRIPT_PATH } from "@/lib/artifact-render";
import type { WorkerEnv } from "@/lib/env";
import {
  fakeAssets,
  failingArtifactStore,
  FAKE_APP_HOST,
  liveKv,
  mergeKv,
  stubAccessTokens,
  stubArtifactMetadata,
  stubArtifactStore,
  stubAssets,
  testWorkerEnv,
} from "@/lib/fakes";
import { hashArtifactPassword } from "@/lib/password";
import { mintUnlockGrant } from "@/lib/unlock-grants";
import { handleSandboxRequest } from "./sandbox";

const ARTIFACT_ID = "b".repeat(32);
const VIEW_TOKEN = "d".repeat(32);
const VALID_HTML = "<!doctype html><html><body>Hi</body></html>";
const METADATA = {
  fileName: "deck.html",
  size: VALID_HTML.length,
  uploadedAt: "2026-08-01T00:00:00.000Z",
};

function envWith(
  store: R2Bucket,
  kv: KVNamespace,
  assets: Fetcher = fakeAssets() as unknown as Fetcher,
): WorkerEnv {
  return testWorkerEnv({
    ARTIFACT_STORE: store,
    ARTIFACT_METADATA: kv,
    ASSETS: assets,
  });
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

  it("serves the runtime script with the app origin injected", async () => {
    const assets = stubAssets([
      {
        path: "/runtime.js",
        body: "console.log(1);",
        contentType: "text/javascript",
      },
    ]);
    const response = await handleSandboxRequest(
      request(RUNTIME_SCRIPT_PATH),
      envWith(stubArtifactStore([]), mergeKv(stubAccessTokens([])), assets),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body.startsWith('"use strict";\nwindow.__coedit__=')).toBe(true);
    expect(body).toContain(`"appOrigin":"https://${FAKE_APP_HOST}"`);
    expect(body).toContain("console.log(1);");
    expect(response.headers.get("content-type")).toBe("text/javascript");
  });

  it("keeps the runtime bundle's own strict-mode directive effective", async () => {
    const assets = stubAssets([
      {
        path: "/runtime.js",
        body: '"use strict";\nconsole.log(1);',
        contentType: "text/javascript",
      },
    ]);
    const response = await handleSandboxRequest(
      request(RUNTIME_SCRIPT_PATH),
      envWith(stubArtifactStore([]), mergeKv(stubAccessTokens([])), assets),
    );
    const body = await response.text();
    const directivePrologue = body.slice(0, body.indexOf("window."));

    expect(directivePrologue.trim()).toBe('"use strict";');
  });

  it("returns 404 for the runtime script path when no bundle asset exists", async () => {
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
    const response = await handleSandboxRequest(
      request(`/${VIEW_TOKEN}`),
      envWith(
        failingArtifactStore("R2 connection reset at internal-host-9"),
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
        passwordHash: await hashArtifactPassword(password),
      });
    }

    it("refuses a protected artifact with no unlock grant", async () => {
      const response = await handleSandboxRequest(
        request(`/${VIEW_TOKEN}`),
        await envWithPassword("hunter2"),
      );

      expect(response.status).toBe(401);
    });

    // The password itself never reaches this origin: it is exchanged for a
    // grant on the app origin, so it stays out of history and access logs.
    it("serves the artifact when a grant for it is presented", async () => {
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

      const response = await handleSandboxRequest(
        request(`/${VIEW_TOKEN}?u=${minted.grant}`),
        envWith(
          stubArtifactStore([
            {
              artifactId: ARTIFACT_ID,
              bytes: new Uint8Array(new TextEncoder().encode(VALID_HTML))
                .buffer,
            },
          ]),
          kv,
        ),
      );

      expect(response.status).toBe(200);
    });

    it("refuses a grant issued for a different artifact", async () => {
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
      const minted = await mintUnlockGrant(kv, "9".repeat(32));
      if (!minted.ok) throw new Error("expected a grant");

      const response = await handleSandboxRequest(
        request(`/${VIEW_TOKEN}?u=${minted.grant}`),
        envWith(stubArtifactStore([]), kv),
      );

      expect(response.status).toBe(401);
    });
  });
});
