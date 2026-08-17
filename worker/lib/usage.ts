import type { Addressable } from "@/lib/durable-namespace";
import type {
  AttachVerdict,
  DetachVerdict,
  Usage,
  UsageVerdict,
} from "@/usage-ledger";

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

export type AttachOutcome =
  | { ok: true; allowed: boolean; store: boolean }
  | { ok: false; cause: unknown };

// Owner-scoped, so the digest never has to be checked against anybody else's
// files and an uploader learns nothing about what strangers are storing.
export async function attachBlob(
  ledgers: Addressable,
  ownerId: string,
  options: {
    digest: string;
    artifactId: string;
    bytes: number;
    maxBytes: number;
    maxArtifacts: number;
  },
): Promise<AttachOutcome> {
  try {
    const url = new URL("https://usage.invalid/attach");
    url.searchParams.set("digest", options.digest);
    url.searchParams.set("artifact", options.artifactId);
    url.searchParams.set("bytes", String(options.bytes));
    url.searchParams.set("maxBytes", String(options.maxBytes));
    url.searchParams.set("maxArtifacts", String(options.maxArtifacts));
    const stub = ledgers.get(ledgers.idFromName(ownerLedger(ownerId)));
    const response = await stub.fetch(url.toString());
    if (!response.ok) {
      return { ok: false, cause: `ledger answered ${response.status}` };
    }
    const verdict = (await response.json()) as AttachVerdict;
    return {
      ok: true,
      allowed: verdict.allowed === true,
      store: verdict.store === true,
    };
  } catch (cause) {
    return { ok: false, cause };
  }
}

// True when this artifact was the last thing holding the bytes, which is the
// only moment it is safe to delete them.
export async function detachBlob(
  ledgers: Addressable,
  ownerId: string,
  digest: string,
  artifactId: string,
): Promise<boolean> {
  try {
    const url = new URL("https://usage.invalid/detach");
    url.searchParams.set("digest", digest);
    url.searchParams.set("artifact", artifactId);
    const stub = ledgers.get(ledgers.idFromName(ownerLedger(ownerId)));
    const response = await stub.fetch(url.toString());
    if (!response.ok) {
      return false;
    }
    const verdict = (await response.json()) as DetachVerdict;
    return verdict.lastReference === true;
  } catch (cause) {
    console.error("Failed to detach a blob reference", cause);
    return false;
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
