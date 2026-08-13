import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@/lib/env";
import {
  liveKv,
  mergeKv,
  stubAccessTokens,
  stubArtifactMetadata,
  testWorkerEnv,
} from "@/lib/fakes";
import { hashArtifactPassword } from "@/lib/password";
import { handleGetArtifact } from "./artifact";
import { handleUnlockArtifact } from "./unlock";

const ARTIFACT_ID = "a".repeat(32);
const VIEW_TOKEN = "c".repeat(32);
const PASSWORD = "hunter2";
const METADATA = {
  fileName: "deck.html",
  size: 42,
  uploadedAt: "2026-08-01T00:00:00.000Z",
};

async function envWithPassword(): Promise<WorkerEnv> {
  return testWorkerEnv({
    ARTIFACT_METADATA: mergeKv(
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
            passwordHash: await hashArtifactPassword(PASSWORD),
          },
        },
      ]),
      liveKv(),
    ),
  });
}

function unlockRequest(body: unknown): Request {
  return new Request(`https://app.test/api/artifacts/${VIEW_TOKEN}/unlock`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.9",
    },
    body: JSON.stringify(body),
  });
}

describe("handleUnlockArtifact", () => {
  it("returns the artifact URL carrying a grant when the password is right", async () => {
    const response = await handleUnlockArtifact(
      VIEW_TOKEN,
      unlockRequest({ password: PASSWORD }),
      await envWithPassword(),
    );
    const body = (await response.json()) as Record<string, string>;

    expect(response.status).toBe(200);
    expect(body.fileName).toBe("deck.html");
    expect(body.artifactUrl).toMatch(/\?u=[0-9a-f]{32}$/);
  });

  it("never echoes the password back", async () => {
    const response = await handleUnlockArtifact(
      VIEW_TOKEN,
      unlockRequest({ password: PASSWORD }),
      await envWithPassword(),
    );

    expect(await response.text()).not.toContain(PASSWORD);
  });

  it("rejects the wrong password", async () => {
    const response = await handleUnlockArtifact(
      VIEW_TOKEN,
      unlockRequest({ password: "nope" }),
      await envWithPassword(),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Incorrect password.");
  });

  it("rejects a body with no password", async () => {
    const response = await handleUnlockArtifact(
      VIEW_TOKEN,
      unlockRequest({}),
      await envWithPassword(),
    );

    expect(response.status).toBe(400);
  });

  it("locks out after ten wrong passwords", async () => {
    const env = await envWithPassword();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await handleUnlockArtifact(
        VIEW_TOKEN,
        unlockRequest({ password: "no" }),
        env,
      );
    }

    const response = await handleUnlockArtifact(
      VIEW_TOKEN,
      unlockRequest({ password: PASSWORD }),
      env,
    );

    expect(response.status).toBe(429);
  });

  it("does not spend the attempt budget on correct passwords", async () => {
    const env = await envWithPassword();
    for (let unlock = 0; unlock < 30; unlock += 1) {
      const response = await handleUnlockArtifact(
        VIEW_TOKEN,
        unlockRequest({ password: PASSWORD }),
        env,
      );
      expect(response.status).toBe(200);
    }
  });

  it("answers with the same shape the metadata route does", async () => {
    const env = await envWithPassword();
    const unlocked = await handleUnlockArtifact(
      VIEW_TOKEN,
      unlockRequest({ password: PASSWORD }),
      env,
    );
    const grant = new URL(
      ((await unlocked.json()) as { artifactUrl: string }).artifactUrl,
    ).searchParams.get("u");

    const metadata = await handleGetArtifact(
      VIEW_TOKEN,
      new Request(`https://app.test/api/artifacts/${VIEW_TOKEN}?u=${grant}`),
      env,
    );

    const unlockedAgain = await handleUnlockArtifact(
      VIEW_TOKEN,
      unlockRequest({ password: PASSWORD }),
      env,
    );
    expect(Object.keys((await unlockedAgain.json()) as object).sort()).toEqual(
      Object.keys((await metadata.json()) as object).sort(),
    );
  });

  it("returns 404 for a token that does not exist", async () => {
    const response = await handleUnlockArtifact(
      "f".repeat(32),
      unlockRequest({ password: PASSWORD }),
      await envWithPassword(),
    );

    expect(response.status).toBe(404);
  });
});
