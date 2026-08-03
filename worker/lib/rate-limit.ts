export type RateLimitCheck =
  { ok: true; allowed: boolean } | { ok: false; cause: unknown };

// A read-then-write counter, not an atomic increment: KV has no atomic
// increment, so concurrent requests can race and let slightly more than
// `limit` through in the same window. Acceptable for an abuse ceiling, not
// for anything that needs a hard guarantee.
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitCheck> {
  try {
    const raw = await kv.get(key);
    const count = raw === null ? 0 : Number(raw);
    if (count >= limit) {
      return { ok: true, allowed: false };
    }
    await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
    return { ok: true, allowed: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}
