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
