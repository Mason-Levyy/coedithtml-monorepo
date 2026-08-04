import { describe, expect, it } from "vitest";
import { parseWorkerEnv } from "./env";
import {
  FAKE_APP_HOST,
  FAKE_SANDBOX_HOST,
  fakeArtifactMetadata,
  fakeArtifactStore,
  fakeWorkerEnv,
  fakeWorkerEnvWithout,
} from "./fakes";

function invalidBindingsOf(result: ReturnType<typeof parseWorkerEnv>) {
  return result.ok ? [] : result.invalidBindings;
}

describe("parseWorkerEnv", () => {
  it("accepts an env with every binding present", () => {
    const result = parseWorkerEnv(fakeWorkerEnv());

    expect(result.ok).toBe(true);
  });

  it("reports a binding missing from wrangler.jsonc", () => {
    const result = parseWorkerEnv(fakeWorkerEnvWithout("ARTIFACT_STORE"));

    expect(invalidBindingsOf(result)).toEqual(["ARTIFACT_STORE"]);
  });

  it("reports every invalid binding rather than only the first", () => {
    const result = parseWorkerEnv({});

    expect(invalidBindingsOf(result)).toEqual([
      "ARTIFACT_STORE",
      "ARTIFACT_METADATA",
      "ASSETS",
      "APP_HOST",
      "SANDBOX_HOST",
      "REDIRECT_HOSTS",
      "REDIRECT_TARGET",
    ]);
  });

  it("rejects a binding that is not a storage object at all", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      ARTIFACT_STORE: "coedit-artifacts",
    });

    expect(invalidBindingsOf(result)).toEqual(["ARTIFACT_STORE"]);
  });

  it("rejects a KV namespace bound where the R2 bucket belongs", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      ARTIFACT_STORE: fakeArtifactMetadata(),
    });

    expect(invalidBindingsOf(result)).toEqual(["ARTIFACT_STORE"]);
  });

  it("rejects an R2 bucket bound where the KV namespace belongs", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      ARTIFACT_METADATA: fakeArtifactStore(),
    });

    expect(invalidBindingsOf(result)).toEqual(["ARTIFACT_METADATA"]);
  });

  it("rejects an ASSETS binding with no fetch method", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      ASSETS: {},
    });

    expect(invalidBindingsOf(result)).toEqual(["ASSETS"]);
  });

  it("rejects a null binding", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      ARTIFACT_STORE: null,
    });

    expect(invalidBindingsOf(result)).toEqual(["ARTIFACT_STORE"]);
  });

  it("refuses to start when both origins are the same host", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      SANDBOX_HOST: FAKE_APP_HOST,
    });

    expect(invalidBindingsOf(result)).toEqual(["SANDBOX_HOST"]);
  });

  it("treats hosts differing only by case as the same origin", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      SANDBOX_HOST: FAKE_APP_HOST.toUpperCase(),
    });

    expect(invalidBindingsOf(result)).toEqual(["SANDBOX_HOST"]);
  });

  it("treats hosts differing only by a trailing dot as the same origin", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      SANDBOX_HOST: "app.test.:8787",
    });

    expect(invalidBindingsOf(result)).toEqual(["SANDBOX_HOST"]);
  });

  it("refuses to start when a redirect host shadows the sandbox origin", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      REDIRECT_HOSTS: `www.test:8787,${FAKE_SANDBOX_HOST}`,
    });

    expect(invalidBindingsOf(result)).toEqual(["REDIRECT_HOSTS"]);
  });

  it("rejects a host given as a full URL", () => {
    const result = parseWorkerEnv({
      ...fakeWorkerEnv(),
      APP_HOST: "https://app.test",
    });

    expect(invalidBindingsOf(result)).toEqual(["APP_HOST"]);
  });
});
