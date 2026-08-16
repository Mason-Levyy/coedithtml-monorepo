import { describe, expect, it } from "vitest";
import { resolveAccessToken } from "@/lib/access-tokens";
import { liveKv, testWorkerEnv } from "@/lib/fakes";
import { TOKEN_FIELD, TOKEN_KINDS } from "@/lib/room-capabilities";
import { regenerateShareToken } from "./share-tokens";

const ARTIFACT_ID = "a".repeat(32);

describe("regenerateShareToken", () => {
  it("mints a token when none existed, with no sibling links", async () => {
    const kv = liveKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });

    const result = await regenerateShareToken(env, ARTIFACT_ID, "view", {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.tokens.viewToken).toBe(result.token);
    const resolved = await resolveAccessToken(kv, result.token);
    expect(resolved.ok && resolved.record?.siblingTokens).toBeUndefined();
  });

  it("revokes the old token and keeps siblings in sync when all three exist", async () => {
    const kv = liveKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });

    const current = {
      viewToken: "v".repeat(32),
      suggestToken: "s".repeat(32),
      editToken: "e".repeat(32),
    };
    for (const kind of TOKEN_KINDS) {
      await kv.put(
        `tokens/${current[TOKEN_FIELD[kind]]}`,
        JSON.stringify({
          artifactId: ARTIFACT_ID,
          kind,
          siblingTokens: {
            view: current.viewToken,
            suggest: current.suggestToken,
            edit: current.editToken,
          },
        }),
      );
    }

    const result = await regenerateShareToken(
      env,
      ARTIFACT_ID,
      "view",
      current,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const oldResolved = await resolveAccessToken(kv, current.viewToken);
    expect(oldResolved.ok && oldResolved.record).toBeNull();

    const newResolved = await resolveAccessToken(kv, result.token);
    expect(newResolved.ok && newResolved.record?.siblingTokens?.view).toBe(
      result.token,
    );

    const suggestResolved = await resolveAccessToken(kv, current.suggestToken);
    expect(
      suggestResolved.ok && suggestResolved.record?.siblingTokens?.view,
    ).toBe(result.token);
  });
});
