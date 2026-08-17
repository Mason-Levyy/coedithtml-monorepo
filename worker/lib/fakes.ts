import type { OverlayEntry } from "@coedithtml/protocol";
import type { TokenRecord } from "./access-tokens";
import { parseWorkerEnv, type WorkerEnv } from "./env";
import type { EntryStore } from "./overlay-log";
import {
  accessTokenKey,
  artifactMetadataKey,
  artifactObjectKey,
} from "./storage-keys";

export function fakeArtifactStore(): Record<string, unknown> {
  return {
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(undefined),
    head: () => Promise.resolve(null),
    delete: () => Promise.resolve(undefined),
  };
}

export function stubArtifactStore(
  stored: { artifactId: string; revision: string; bytes: ArrayBuffer }[],
): R2Bucket {
  return stubBlobStore(
    stored.map(({ artifactId, revision, bytes }) => ({
      key: artifactObjectKey(artifactId, revision),
      bytes,
    })),
  );
}

export function stubBlobStore(
  stored: { key: string; bytes?: ArrayBuffer; body?: string }[],
): R2Bucket {
  const entries = new Map(
    stored.map(({ key, bytes, body }) => [
      key,
      bytes ?? (new TextEncoder().encode(body ?? "").buffer as ArrayBuffer),
    ]),
  );
  return {
    get: (key: string) => {
      const bytes = entries.get(key);
      if (bytes === undefined) return Promise.resolve(null);
      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(bytes),
      } as unknown as R2ObjectBody);
    },
    put: () => Promise.resolve(undefined),
    head: () => Promise.resolve(null),
    delete: () => Promise.resolve(undefined),
  } as unknown as R2Bucket;
}

export type RecordingBucket = {
  puts: { key: string; bytes: ArrayBuffer }[];
  bucket: R2Bucket;
};

export function recordingArtifactStore(
  onPut?: () => never | void,
): RecordingBucket {
  const puts: { key: string; bytes: ArrayBuffer }[] = [];
  const bucket = {
    put: (key: string, bytes: ArrayBuffer) => {
      onPut?.();
      puts.push({ key, bytes });
      return Promise.resolve(undefined);
    },
    get: () => Promise.resolve(null),
    head: () => Promise.resolve(null),
    delete: () => Promise.resolve(undefined),
  } as unknown as R2Bucket;
  return { puts, bucket };
}

export function fakeArtifactMetadata(): Record<string, unknown> {
  return {
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(undefined),
    list: () => Promise.resolve({ keys: [] }),
    delete: () => Promise.resolve(undefined),
  };
}

export type RecordingMetadataStore = {
  puts: { key: string; value: string }[];
  kv: KVNamespace;
};

export function recordingArtifactMetadata(
  onPut?: () => never | void,
): RecordingMetadataStore {
  const puts: { key: string; value: string }[] = [];
  const kv = {
    put: (key: string, value: string) => {
      onPut?.();
      puts.push({ key, value });
      return Promise.resolve(undefined);
    },
    get: () => Promise.resolve(null),
    list: () => Promise.resolve({ keys: [] }),
    delete: () => Promise.resolve(undefined),
  } as unknown as KVNamespace;
  return { puts, kv };
}

export function stubArtifactMetadata(
  stored: { artifactId: string; metadata: unknown }[],
): KVNamespace {
  const entries = new Map(
    stored.map(({ artifactId, metadata }) => [
      artifactMetadataKey(artifactId),
      JSON.stringify(metadata),
    ]),
  );
  return {
    get: (key: string) => Promise.resolve(entries.get(key) ?? null),
    put: () => Promise.resolve(undefined),
    list: () => Promise.resolve({ keys: [] }),
    delete: () => Promise.resolve(undefined),
  } as unknown as KVNamespace;
}

export function stubAccessTokens(
  stored: { token: string; record: TokenRecord }[],
): KVNamespace {
  const entries = new Map(
    stored.map(({ token, record }) => [
      accessTokenKey(token),
      JSON.stringify(record),
    ]),
  );
  return {
    get: (key: string) => Promise.resolve(entries.get(key) ?? null),
    put: () => Promise.resolve(undefined),
    list: () => Promise.resolve({ keys: [] }),
    delete: () => Promise.resolve(undefined),
  } as unknown as KVNamespace;
}

export function liveKv(
  seed: { key: string; value: unknown }[] = [],
): KVNamespace {
  const store = new Map(
    seed.map(({ key, value }) => [key, JSON.stringify(value)]),
  );
  return {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    put: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve(undefined);
    },
    list: (options?: { prefix?: string; limit?: number }) => {
      const matching = [...store.keys()]
        .filter((key) => key.startsWith(options?.prefix ?? ""))
        .slice(0, options?.limit ?? store.size)
        .map((name) => ({ name }));
      return Promise.resolve({ keys: matching, list_complete: true });
    },
    delete: (key: string) => {
      store.delete(key);
      return Promise.resolve(undefined);
    },
  } as unknown as KVNamespace;
}

export function liveArtifactStore(): R2Bucket {
  const objects = new Map<string, ArrayBuffer>();
  return {
    get: (key: string) => {
      const bytes = objects.get(key);
      if (bytes === undefined) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(bytes),
      } as unknown as R2ObjectBody);
    },
    put: (key: string, bytes: ArrayBuffer) => {
      objects.set(key, bytes);
      return Promise.resolve(undefined);
    },
    head: (key: string) =>
      Promise.resolve(objects.has(key) ? ({} as R2Object) : null),
    delete: (key: string) => {
      objects.delete(key);
      return Promise.resolve(undefined);
    },
  } as unknown as R2Bucket;
}

export function mergeKv(...stores: KVNamespace[]): KVNamespace {
  const writable = stores.at(-1);
  return {
    get: async (key: string) => {
      for (const store of stores) {
        const value = await store.get(key);
        if (value !== null) {
          return value;
        }
      }
      return null;
    },
    put: (key: string, value: string, options?: unknown) =>
      writable === undefined
        ? Promise.resolve(undefined)
        : writable.put(key, value, options as KVNamespacePutOptions),
    list: () => Promise.resolve({ keys: [] }),
    delete: (key: string) =>
      writable === undefined
        ? Promise.resolve(undefined)
        : writable.delete(key),
  } as unknown as KVNamespace;
}

export function failingKv(message: string): KVNamespace {
  const boom = () => {
    throw new Error(message);
  };
  return {
    get: boom,
    put: () => Promise.resolve(undefined),
    list: () => Promise.resolve({ keys: [] }),
    delete: () => Promise.resolve(undefined),
  } as unknown as KVNamespace;
}

export function failingArtifactStore(message: string): R2Bucket {
  const boom = () => {
    throw new Error(message);
  };
  return {
    get: boom,
    put: () => Promise.resolve(undefined),
    head: () => Promise.resolve(null),
    delete: () => Promise.resolve(undefined),
  } as unknown as R2Bucket;
}

export function unwritableArtifactStore(message: string): R2Bucket {
  return {
    get: () => Promise.resolve(null),
    put: () => {
      throw new Error(message);
    },
    head: () => Promise.resolve(null),
    delete: () => Promise.resolve(undefined),
  } as unknown as R2Bucket;
}

export function memoryEntryStore(seed: OverlayEntry[] = []): EntryStore {
  const entries = new Map(seed.map((entry) => [entry.id, entry]));
  return {
    list: () => Array.from(entries.values()),
    get: (id: string) => entries.get(id) ?? null,
    put: (entry: OverlayEntry) => {
      entries.set(entry.id, entry);
    },
    remove: (id: string) => {
      entries.delete(id);
    },
    count: () => entries.size,
  };
}

export const FAKE_ROOM_HEADER = "x-fake-room";

function fakeRoomResponse(request?: Request): Response {
  // The sweep asks a room what it holds before taking the artifact away, so an
  // empty overlay is what an empty room has to answer with.
  if (request !== undefined && new URL(request.url).pathname === "/overlay") {
    return Response.json({ version: 1, artifactRevision: "r1", entries: [] });
  }
  return new Response(null, { headers: { [FAKE_ROOM_HEADER]: "connected" } });
}

export function fakeDocRoom(): Record<string, unknown> {
  return {
    get: () => ({
      fetch: (request: Request) => Promise.resolve(fakeRoomResponse(request)),
    }),
    idFromName: (name: string) => ({ toString: () => name }),
  };
}

export type RecordingDocRoom = {
  connects: { name: string; request: Request }[];
  namespace: DurableObjectNamespace;
};

export function recordingDocRoom(): RecordingDocRoom {
  const connects: { name: string; request: Request }[] = [];
  const namespace = {
    idFromName: (name: string) => ({ toString: () => name }),
    get: (id: { toString(): string }) => ({
      fetch: (request: Request) => {
        connects.push({ name: id.toString(), request });
        return Promise.resolve(fakeRoomResponse(request));
      },
    }),
  } as unknown as DurableObjectNamespace;
  return { connects, namespace };
}

// A counter per key, in memory, with the same answers the real Durable Object
// gives. Tests want to know that a route charges and refuses, not that a
// Durable Object stores.
export function fakeRateLimiter(): Record<string, unknown> {
  const counts = new Map<string, number>();
  return {
    idFromName: (name: string) => ({ toString: () => name }),
    get: (id: { toString(): string }) => ({
      fetch: (url: string) => {
        const key = id.toString();
        const path = new URL(url);
        if (path.pathname === "/refund") {
          counts.set(key, Math.max(0, (counts.get(key) ?? 0) - 1));
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        const limit = Number(path.searchParams.get("limit"));
        const seen = counts.get(key) ?? 0;
        if (seen >= limit) {
          return Promise.resolve(
            Response.json({ allowed: false, retryAfterSeconds: 60 }),
          );
        }
        counts.set(key, seen + 1);
        return Promise.resolve(
          Response.json({ allowed: true, retryAfterSeconds: 0 }),
        );
      },
    }),
  };
}

export function fakeUsageLedger(): Record<string, unknown> {
  const held = new Map<string, { bytes: number; artifacts: number }>();
  const refs = new Map<string, { bytes: number; artifacts: string[] }>();
  return {
    idFromName: (name: string) => ({ toString: () => name }),
    get: (id: { toString(): string }) => ({
      fetch: (url: string) => {
        const key = id.toString();
        const path = new URL(url);
        const usage = held.get(key) ?? { bytes: 0, artifacts: 0 };
        const bytes = Number(path.searchParams.get("bytes"));
        const digest = `${key}:${path.searchParams.get("digest") ?? ""}`;
        const artifactId = path.searchParams.get("artifact") ?? "";
        const fits = (next: { bytes: number; artifacts: number }) =>
          next.bytes <= Number(path.searchParams.get("maxBytes")) &&
          next.artifacts <= Number(path.searchParams.get("maxArtifacts"));

        if (path.pathname === "/read") {
          return Promise.resolve(Response.json(usage));
        }
        if (path.pathname === "/release") {
          held.set(key, {
            bytes: Math.max(0, usage.bytes - bytes),
            artifacts: Math.max(0, usage.artifacts - 1),
          });
          return Promise.resolve(Response.json(held.get(key)));
        }
        if (path.pathname === "/attach") {
          const existing = refs.get(digest);
          const next = {
            bytes: usage.bytes + (existing === undefined ? bytes : 0),
            artifacts: usage.artifacts + 1,
          };
          if (!fits(next)) {
            return Promise.resolve(
              Response.json({ allowed: false, store: false }),
            );
          }
          const entry = existing ?? { bytes, artifacts: [] };
          if (!entry.artifacts.includes(artifactId)) {
            entry.artifacts.push(artifactId);
          }
          refs.set(digest, entry);
          held.set(key, next);
          return Promise.resolve(
            Response.json({ allowed: true, store: existing === undefined }),
          );
        }
        if (path.pathname === "/detach") {
          const existing = refs.get(digest);
          if (existing === undefined) {
            return Promise.resolve(Response.json({ lastReference: false }));
          }
          const remaining = existing.artifacts.filter(
            (name) => name !== artifactId,
          );
          const last = remaining.length === 0;
          held.set(key, {
            bytes: Math.max(0, usage.bytes - (last ? existing.bytes : 0)),
            artifacts: Math.max(0, usage.artifacts - 1),
          });
          if (last) {
            refs.delete(digest);
          } else {
            refs.set(digest, { ...existing, artifacts: remaining });
          }
          return Promise.resolve(Response.json({ lastReference: last }));
        }

        const next = {
          bytes: usage.bytes + bytes,
          artifacts: usage.artifacts + 1,
        };
        if (!fits(next)) {
          return Promise.resolve(Response.json({ allowed: false, usage }));
        }
        held.set(key, next);
        return Promise.resolve(Response.json({ allowed: true, usage: next }));
      },
    }),
  };
}

export function fullUsageLedger(): Record<string, unknown> {
  return {
    idFromName: (name: string) => ({ toString: () => name }),
    get: () => ({
      fetch: () =>
        Promise.resolve(
          Response.json({ allowed: false, usage: { bytes: 0, artifacts: 0 } }),
        ),
    }),
  };
}

export type CountingUsageLedger = {
  holds: number;
  releases: number;
  namespace: DurableObjectNamespace;
};

export function countingUsageLedger(): CountingUsageLedger {
  const counts = { holds: 0, releases: 0 };
  const namespace = {
    idFromName: (name: string) => ({ toString: () => name }),
    get: () => ({
      fetch: (url: string) => {
        const { pathname } = new URL(url);
        if (pathname === "/release" || pathname === "/detach") {
          counts.releases += 1;
          return Promise.resolve(Response.json({ lastReference: true }));
        }
        counts.holds += 1;
        return Promise.resolve(
          Response.json({
            allowed: true,
            store: true,
            usage: { bytes: 0, artifacts: 1 },
          }),
        );
      },
    }),
  } as unknown as DurableObjectNamespace;
  return {
    get holds() {
      return counts.holds;
    },
    get releases() {
      return counts.releases;
    },
    namespace,
  };
}

export function fakeAssets(): Record<string, unknown> {
  return {
    fetch: () => Promise.resolve(new Response("", { status: 404 })),
  };
}

export function stubAssets(
  files: {
    path: string;
    body: string;
    contentType?: string;
    headers?: Record<string, string>;
  }[],
): Fetcher {
  const entries = new Map(files.map((file) => [file.path, file]));
  return {
    fetch: (input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const file = entries.get(new URL(url).pathname);
      if (!file) {
        return Promise.resolve(new Response("Not found", { status: 404 }));
      }
      const headers = new Headers(file.headers);
      if (file.contentType) {
        headers.set("content-type", file.contentType);
      }
      return Promise.resolve(new Response(file.body, { status: 200, headers }));
    },
  } as unknown as Fetcher;
}

export const FAKE_APP_HOST = "app.test:8787";
export const FAKE_SANDBOX_HOST = "sandbox.test:8787";
export const FAKE_REDIRECT_HOST = "www.test:8787";
export const FAKE_REDIRECT_TARGET = "test:8787";

export function fakeWorkerEnv(): Record<string, unknown> {
  return {
    ARTIFACT_STORE: fakeArtifactStore(),
    ARTIFACT_METADATA: fakeArtifactMetadata(),
    ASSETS: fakeAssets(),
    DOC_ROOM: fakeDocRoom(),
    RATE_LIMITER: fakeRateLimiter(),
    USAGE_LEDGER: fakeUsageLedger(),
    APP_HOST: FAKE_APP_HOST,
    SANDBOX_HOST: FAKE_SANDBOX_HOST,
    REDIRECT_HOSTS: FAKE_REDIRECT_HOST,
    REDIRECT_TARGET: FAKE_REDIRECT_TARGET,
    MCP_ENABLED: "true",
  };
}

export function fakeWorkerEnvWithout(key: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fakeWorkerEnv()).filter(([name]) => name !== key),
  );
}

export function testWorkerEnv(
  overrides: Record<string, unknown> = {},
): WorkerEnv {
  const parsed = parseWorkerEnv({ ...fakeWorkerEnv(), ...overrides });
  if (!parsed.ok) {
    throw new Error(
      `fake env is invalid: ${parsed.invalidBindings.join(", ")}`,
    );
  }
  return parsed.env;
}
