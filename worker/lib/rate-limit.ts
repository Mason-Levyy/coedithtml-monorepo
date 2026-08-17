import type { Addressable } from "@/lib/durable-namespace";
import type { RateLimitVerdict } from "@/rate-limiter";

export type RateLimitCheck =
  | { ok: true; allowed: boolean; retryAfterSeconds: number }
  | { ok: false; cause: unknown };

// One call, not two. The old pair — ask, then record — was two round trips
// with a gap in the middle wide enough for every parallel upload to pass the
// same check, which is most of why the KV version never limited anything.
export async function chargeAttempt(
  limiter: Addressable,
  key: string,
  options: { limit: number; windowSeconds: number },
): Promise<RateLimitCheck> {
  try {
    const stub = limiter.get(limiter.idFromName(key));
    const response = await stub.fetch(
      `https://rate-limit.invalid/spend?limit=${options.limit}&window=${options.windowSeconds}`,
    );
    if (!response.ok) {
      return { ok: false, cause: `rate limiter answered ${response.status}` };
    }
    const verdict = (await response.json()) as RateLimitVerdict;
    return {
      ok: true,
      allowed: verdict.allowed === true,
      retryAfterSeconds: verdict.retryAfterSeconds,
    };
  } catch (cause) {
    return { ok: false, cause };
  }
}

// Best effort: a reader who typed the right password must not be turned away
// because the refund failed. The worst it costs is one attempt of their budget.
export async function refundAttempt(
  limiter: Addressable,
  key: string,
): Promise<void> {
  try {
    const stub = limiter.get(limiter.idFromName(key));
    await stub.fetch("https://rate-limit.invalid/refund");
  } catch (cause) {
    console.error("Failed to refund a rate-limited attempt", cause);
  }
}
