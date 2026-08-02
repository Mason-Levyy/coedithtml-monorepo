import type { TokenRecord } from "./access-tokens";
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
  stored: { artifactId: string; bytes: ArrayBuffer }[],
): R2Bucket {
  const entries = new Map(
    stored.map(({ artifactId, bytes }) => [
      artifactObjectKey(artifactId),
      bytes,
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

export function mergeKv(...stores: KVNamespace[]): KVNamespace {
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
    put: () => Promise.resolve(undefined),
    list: () => Promise.resolve({ keys: [] }),
    delete: () => Promise.resolve(undefined),
  } as unknown as KVNamespace;
}

export const FAKE_APP_HOST = "app.test:8787";
export const FAKE_SANDBOX_HOST = "sandbox.test:8787";
export const FAKE_REDIRECT_HOST = "www.test:8787";
export const FAKE_REDIRECT_TARGET = "test:8787";

export function fakeWorkerEnv(): Record<string, unknown> {
  return {
    ARTIFACT_STORE: fakeArtifactStore(),
    ARTIFACT_METADATA: fakeArtifactMetadata(),
    APP_HOST: FAKE_APP_HOST,
    SANDBOX_HOST: FAKE_SANDBOX_HOST,
    REDIRECT_HOSTS: FAKE_REDIRECT_HOST,
    REDIRECT_TARGET: FAKE_REDIRECT_TARGET,
  };
}

export function fakeWorkerEnvWithout(key: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fakeWorkerEnv()).filter(([name]) => name !== key),
  );
}
