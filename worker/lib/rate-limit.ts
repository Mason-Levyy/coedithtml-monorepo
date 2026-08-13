export type RateLimitCheck =
  { ok: true; allowed: boolean } | { ok: false; cause: unknown };

export type RateLimitRecord = { ok: true } | { ok: false; cause: unknown };

async function readCount(kv: KVNamespace, key: string): Promise<number> {
  const raw = await kv.get(key);
  return raw === null ? 0 : Number(raw);
}

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
