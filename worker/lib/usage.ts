import type { Addressable } from "@/lib/durable-namespace";
import type {
  AttachVerdict,
  DetachVerdict,
  Usage,
  UsageVerdict,
} from "@/usage-ledger";

export const GLOBAL_MAX_BYTES = 8 * 1024 * 1024 * 1024;
export const GLOBAL_MAX_ARTIFACTS = 20_000;

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
