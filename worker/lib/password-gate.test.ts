import { describe, expect, it } from "vitest";
import { liveKv } from "./fakes";
import { checkPasswordGate } from "./password-gate";
import { mintUnlockGrant } from "./unlock-grants";

const ARTIFACT_ID = "a".repeat(32);
const OTHER_ARTIFACT_ID = "b".repeat(32);
const HASH = "pbkdf2$100000$abcd$ef01";

describe("checkPasswordGate", () => {
  it("lets a link with no password through untouched", async () => {
    const result = await checkPasswordGate(liveKv(), {
      artifactId: ARTIFACT_ID,
      passwordHash: undefined,
      grant: null,
    });

    expect(result.ok).toBe(true);
  });

  it("refuses a protected link with no grant", async () => {
    const result = await checkPasswordGate(liveKv(), {
      artifactId: ARTIFACT_ID,
      passwordHash: HASH,
      grant: null,
    });

    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("accepts a grant minted for this artifact", async () => {
    const kv = liveKv();
    const minted = await mintUnlockGrant(kv, ARTIFACT_ID);
    if (!minted.ok) throw new Error("expected a grant");

    const result = await checkPasswordGate(kv, {
      artifactId: ARTIFACT_ID,
      passwordHash: HASH,
      grant: minted.grant,
    });

    expect(result.ok).toBe(true);
  });

  it("refuses a grant minted for a different artifact", async () => {
    const kv = liveKv();
    const minted = await mintUnlockGrant(kv, OTHER_ARTIFACT_ID);
    if (!minted.ok) throw new Error("expected a grant");

    const result = await checkPasswordGate(kv, {
      artifactId: ARTIFACT_ID,
      passwordHash: HASH,
      grant: minted.grant,
    });

    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("refuses a grant that was never issued", async () => {
    const result = await checkPasswordGate(liveKv(), {
      artifactId: ARTIFACT_ID,
      passwordHash: HASH,
      grant: "c".repeat(32),
    });

    expect(result).toMatchObject({ ok: false, status: 401 });
  });
});
