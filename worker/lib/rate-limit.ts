import type { Addressable } from "@/lib/durable-namespace";
import type { RateLimitVerdict } from "@/rate-limiter";

export type RateLimitCheck =
  | { ok: true; allowed: boolean; retryAfterSeconds: number }
  | { ok: false; cause: unknown };

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
