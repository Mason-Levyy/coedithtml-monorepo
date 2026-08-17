import type { Addressable } from "@/lib/durable-namespace";
import type { Usage, UsageVerdict } from "@/usage-ledger";

// R2's free tier is 10GB. The point of a ceiling is that the limit is a policy
// somebody chose rather than an invoice somebody receives, so it sits below
// that with room to notice.
export const GLOBAL_MAX_BYTES = 8 * 1024 * 1024 * 1024;
export const GLOBAL_MAX_ARTIFACTS = 20_000;

// What one anonymous person may keep. The IP ceiling stays as the backstop for
// somebody who clears their cookie, but it is a backstop and not the defence:
// an IP is shared by an office and changed by a phone.
export const OWNER_MAX_BYTES = 200 * 1024 * 1024;
export const OWNER_MAX_ARTIFACTS = 100;

export const GLOBAL_LEDGER = "global";

export function ownerLedger(ownerId: string): string {
  return `owner:${ownerId}`;
}

export type UsageOutcome =
  { ok: true; allowed: boolean } | { ok: false; cause: unknown };

async function call(
  ledgers: Addressable,
  name: string,
  path: string,
  query: Record<string, number>,
): Promise<Response> {
  const url = new URL(`https://usage.invalid${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  const stub = ledgers.get(ledgers.idFromName(name));
  return stub.fetch(url.toString());
}

export async function holdSpace(
  ledgers: Addressable,
  name: string,
  options: { bytes: number; maxBytes: number; maxArtifacts: number },
): Promise<UsageOutcome> {
  try {
    const response = await call(ledgers, name, "/hold", options);
    if (!response.ok) {
      return { ok: false, cause: `ledger answered ${response.status}` };
    }
    const verdict = (await response.json()) as UsageVerdict;
    return { ok: true, allowed: verdict.allowed === true };
  } catch (cause) {
    return { ok: false, cause };
  }
}

// Releasing is best effort on purpose. A delete that already removed the bytes
// must not fail because the ledger was unreachable; the worst a lost release
// costs is a ceiling that arrives sooner than it should.
export async function releaseSpace(
  ledgers: Addressable,
  name: string,
  bytes: number,
): Promise<void> {
  try {
    await call(ledgers, name, "/release", { bytes });
  } catch (cause) {
    console.error("Failed to release ledger space", cause);
  }
}

// The two scopes always move together: an artifact counts against the product
// and against whoever uploaded it, and it stops counting against both at the
// same moment.
export async function releaseClaim(
  env: { USAGE_LEDGER: Addressable },
  ownerId: string | undefined,
  bytes: number,
): Promise<void> {
  await releaseSpace(env.USAGE_LEDGER, GLOBAL_LEDGER, bytes);
  if (ownerId !== undefined && ownerId.length > 0) {
    await releaseSpace(env.USAGE_LEDGER, ownerLedger(ownerId), bytes);
  }
}

export async function readUsage(
  ledgers: Addressable,
  name: string,
): Promise<Usage> {
  try {
    const response = await call(ledgers, name, "/read", {});
    return response.ok
      ? ((await response.json()) as Usage)
      : { bytes: 0, artifacts: 0 };
  } catch {
    return { bytes: 0, artifacts: 0 };
  }
}
