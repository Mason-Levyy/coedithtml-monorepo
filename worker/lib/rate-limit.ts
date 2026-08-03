export type RateLimitCheck =
  { ok: true; allowed: boolean } | { ok: false; cause: unknown };

export type RateLimitRecord = { ok: true } | { ok: false; cause: unknown };

async function readCount(kv: KVNamespace, key: string): Promise<number> {
  const raw = await kv.get(key);
  return raw === null ? 0 : Number(raw);
}

// Checking and recording are separate so a caller can decide what counts as an
// attempt: every upload consumes the ceiling, but only a *failed* password
// consumes one, or reading a shared link a few times would lock the reader out.
export async function isWithinRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
): Promise<RateLimitCheck> {
  try {
    return { ok: true, allowed: (await readCount(kv, key)) < limit };
  } catch (cause) {
    return { ok: false, cause };
  }
}

// A read-then-write counter, not an atomic increment: KV has no atomic
// increment, so concurrent requests can race and let slightly more than
// `limit` through in the same window. Acceptable for an abuse ceiling, not
// for anything that needs a hard guarantee.
export async function recordRateLimitedAttempt(
  kv: KVNamespace,
  key: string,
  windowSeconds: number,
): Promise<RateLimitRecord> {
  try {
    const count = await readCount(kv, key);
    await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}
