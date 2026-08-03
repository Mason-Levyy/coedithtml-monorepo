import { z } from "zod";
import { newUnlockGrant, unlockGrantKey } from "./storage-keys";

// Short-lived on purpose. The grant travels in the iframe URL, where the
// artifact's own scripts can read it — harmless, since it only unlocks the
// artifact already being displayed, which is exactly what a password entered
// into the URL was not.
const GRANT_TTL_SECONDS = 3600;

const grantRecordSchema = z.object({ artifactId: z.string() });

export type MintGrantResult =
  { ok: true; grant: string } | { ok: false; cause: unknown };

export async function mintUnlockGrant(
  kv: KVNamespace,
  artifactId: string,
): Promise<MintGrantResult> {
  const grant = newUnlockGrant();
  try {
    await kv.put(unlockGrantKey(grant), JSON.stringify({ artifactId }), {
      expirationTtl: GRANT_TTL_SECONDS,
    });
    return { ok: true, grant };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export type GrantCheck =
  { ok: true; valid: boolean } | { ok: false; cause: unknown };

export async function unlockGrantAllows(
  kv: KVNamespace,
  grant: string | null,
  artifactId: string,
): Promise<GrantCheck> {
  if (grant === null || grant.length === 0) {
    return { ok: true, valid: false };
  }
  try {
    const raw = await kv.get(unlockGrantKey(grant));
    if (raw === null) {
      return { ok: true, valid: false };
    }
    const parsed = grantRecordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return { ok: false, cause: parsed.error };
    }
    return { ok: true, valid: parsed.data.artifactId === artifactId };
  } catch (cause) {
    return { ok: false, cause };
  }
}
