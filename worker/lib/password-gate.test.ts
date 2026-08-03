import { describe, expect, it } from "vitest";
import { liveKv } from "./fakes";
import { hashArtifactPassword } from "./password";
import { checkPasswordGate } from "./password-gate";

const ARTIFACT_ID = "a".repeat(32);
const PASSWORD = "open sesame";

function request(): Request {
  return new Request("https://sandbox.test/artifact", {
    headers: { "cf-connecting-ip": "203.0.113.7" },
  });
}

async function gate(kv: KVNamespace, providedPassword: string | null) {
  return checkPasswordGate(kv, {
    artifactId: ARTIFACT_ID,
    request: request(),
    passwordHash: await hashArtifactPassword(ARTIFACT_ID, PASSWORD),
    providedPassword,
  });
}

describe("checkPasswordGate", () => {
  it("lets a link with no password through untouched", async () => {
    const result = await checkPasswordGate(liveKv(), {
      artifactId: ARTIFACT_ID,
      request: request(),
      passwordHash: undefined,
      providedPassword: null,
    });

    expect(result.ok).toBe(true);
  });

  it("accepts the correct password", async () => {
    expect((await gate(liveKv(), PASSWORD)).ok).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const result = await gate(liveKv(), "wrong");

    expect(result).toMatchObject({
      status: 401,
      message: "Incorrect password.",
    });
  });

  it("locks out after ten wrong attempts", async () => {
    const kv = liveKv();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(await gate(kv, "wrong")).toMatchObject({ status: 401 });
    }

    expect(await gate(kv, "wrong")).toMatchObject({ status: 429 });
  });

  // The gate is checked once for the metadata request and again for the
  // artifact itself, so counting reads would have locked a reader out of their
  // own link after a handful of page loads.
  it("does not spend the attempt budget on correct passwords", async () => {
    const kv = liveKv();
    for (let view = 0; view < 50; view += 1) {
      expect((await gate(kv, PASSWORD)).ok).toBe(true);
    }

    expect((await gate(kv, PASSWORD)).ok).toBe(true);
  });

  it("keeps a locked-out client locked out even with the right password", async () => {
    const kv = liveKv();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await gate(kv, "wrong");
    }

    expect(await gate(kv, PASSWORD)).toMatchObject({ status: 429 });
  });
});
