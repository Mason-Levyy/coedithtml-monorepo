export function fakeArtifactStore(): Record<string, unknown> {
  return {
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(undefined),
    head: () => Promise.resolve(null),
    delete: () => Promise.resolve(undefined),
  };
}

export function fakeArtifactMetadata(): Record<string, unknown> {
  return {
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(undefined),
    list: () => Promise.resolve({ keys: [] }),
    delete: () => Promise.resolve(undefined),
  };
}

export function fakeWorkerEnv(): Record<string, unknown> {
  return {
    ARTIFACT_STORE: fakeArtifactStore(),
    ARTIFACT_METADATA: fakeArtifactMetadata(),
  };
}
