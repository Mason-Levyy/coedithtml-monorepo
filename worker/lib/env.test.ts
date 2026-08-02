import { describe, expect, it } from "vitest";
import { parseWorkerEnv } from "./env";
import {
  fakeArtifactMetadata,
  fakeArtifactStore,
  fakeWorkerEnv,
} from "./fakes";

describe("parseWorkerEnv", () => {
  it("accepts an env with every binding present", () => {
    const result = parseWorkerEnv(fakeWorkerEnv());

    expect(result.ok).toBe(true);
  });

  it("reports a binding missing from wrangler.jsonc", () => {
    const result = parseWorkerEnv({
      ARTIFACT_METADATA: fakeArtifactMetadata(),
    });

    expect(result).toEqual({ ok: false, invalidBindings: ["ARTIFACT_STORE"] });
  });

  it("reports every invalid binding rather than only the first", () => {
    const result = parseWorkerEnv({});

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.invalidBindings).toEqual([
      "ARTIFACT_STORE",
      "ARTIFACT_METADATA",
    ]);
  });

  it("rejects a binding that is not a storage object at all", () => {
    const result = parseWorkerEnv({
      ARTIFACT_STORE: "coedit-artifacts",
      ARTIFACT_METADATA: fakeArtifactMetadata(),
    });

    expect(result).toEqual({ ok: false, invalidBindings: ["ARTIFACT_STORE"] });
  });

  it("rejects a KV namespace bound where the R2 bucket belongs", () => {
    const result = parseWorkerEnv({
      ARTIFACT_STORE: fakeArtifactMetadata(),
      ARTIFACT_METADATA: fakeArtifactMetadata(),
    });

    expect(result).toEqual({ ok: false, invalidBindings: ["ARTIFACT_STORE"] });
  });

  it("rejects an R2 bucket bound where the KV namespace belongs", () => {
    const result = parseWorkerEnv({
      ARTIFACT_STORE: fakeArtifactStore(),
      ARTIFACT_METADATA: fakeArtifactStore(),
    });

    expect(result).toEqual({
      ok: false,
      invalidBindings: ["ARTIFACT_METADATA"],
    });
  });

  it("rejects a null binding", () => {
    const result = parseWorkerEnv({
      ARTIFACT_STORE: null,
      ARTIFACT_METADATA: fakeArtifactMetadata(),
    });

    expect(result).toEqual({ ok: false, invalidBindings: ["ARTIFACT_STORE"] });
  });
});
