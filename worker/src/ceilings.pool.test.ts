import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { chargeAttempt, refundAttempt } from "@/lib/rate-limit";
import {
  attachBlob,
  detachBlob,
  holdSpace,
  readUsage,
  releaseSpace,
} from "@/lib/usage";

const ROOMY = { maxBytes: 1_000_000, maxArtifacts: 100 };

function charge(key: string, limit = 3) {
  return chargeAttempt(env.RATE_LIMITER, key, { limit, windowSeconds: 60 });
}

describe("a rate limit that is one place", () => {
  it("allows up to the limit and refuses after it", async () => {
    const verdicts = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      verdicts.push(await charge("sequential"));
    }

    expect(verdicts.map((v) => v.ok && v.allowed)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  // The whole reason this stopped being KV. Twenty parallel uploads all read
  // the same count and all passed a limit of twenty.
  it("counts requests that arrive together, not the count they all read", async () => {
    const verdicts = await Promise.all(
      Array.from({ length: 20 }, () => charge("parallel", 5)),
    );

    const allowed = verdicts.filter((v) => v.ok && v.allowed);
    expect(allowed).toHaveLength(5);
  });

  it("keeps two keys apart, so one artifact cannot lock out another", async () => {
    await charge("first", 1);

    const other = await charge("second", 1);

    expect(other.ok && other.allowed).toBe(true);
  });

  it("says how long the caller has to wait", async () => {
    await charge("retry-after", 1);
    const refused = await charge("retry-after", 1);

    expect(refused.ok && refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  // The password gate charges every attempt and hands the correct one back, so
  // reading a document five times cannot lock its reader out of it.
  it("gives an attempt back when the caller earned it", async () => {
    await charge("refundable", 1);
    await refundAttempt(env.RATE_LIMITER, "refundable");

    expect((await charge("refundable", 1)).ok).toBe(true);
  });
});

describe("a ceiling that holds", () => {
  it("adds up what it is holding", async () => {
    await holdSpace(env.USAGE_LEDGER, "adds-up", { bytes: 400, ...ROOMY });
    await holdSpace(env.USAGE_LEDGER, "adds-up", { bytes: 600, ...ROOMY });

    expect(await readUsage(env.USAGE_LEDGER, "adds-up")).toEqual({
      bytes: 1000,
      artifacts: 2,
    });
  });

  it("refuses the upload that would cross the byte ceiling", async () => {
    const first = await holdSpace(env.USAGE_LEDGER, "byte-ceiling", {
      bytes: 900,
      maxBytes: 1000,
      maxArtifacts: 100,
    });
    const second = await holdSpace(env.USAGE_LEDGER, "byte-ceiling", {
      bytes: 200,
      maxBytes: 1000,
      maxArtifacts: 100,
    });

    expect(first.ok && first.allowed).toBe(true);
    expect(second.ok && second.allowed).toBe(false);
  });

  it("refuses the upload that would cross the count ceiling", async () => {
    await holdSpace(env.USAGE_LEDGER, "count-ceiling", {
      bytes: 1,
      maxBytes: 1_000_000,
      maxArtifacts: 1,
    });
    const second = await holdSpace(env.USAGE_LEDGER, "count-ceiling", {
      bytes: 1,
      maxBytes: 1_000_000,
      maxArtifacts: 1,
    });

    expect(second.ok && second.allowed).toBe(false);
  });

  it("does not hold what it refused", async () => {
    await holdSpace(env.USAGE_LEDGER, "refused", {
      bytes: 5000,
      maxBytes: 100,
      maxArtifacts: 100,
    });

    expect(await readUsage(env.USAGE_LEDGER, "refused")).toEqual({
      bytes: 0,
      artifacts: 0,
    });
  });

  it("counts parallel uploads once each, which is the point of the object", async () => {
    await Promise.all(
      Array.from({ length: 12 }, () =>
        holdSpace(env.USAGE_LEDGER, "parallel-hold", { bytes: 100, ...ROOMY }),
      ),
    );

    expect(await readUsage(env.USAGE_LEDGER, "parallel-hold")).toEqual({
      bytes: 1200,
      artifacts: 12,
    });
  });

  it("makes room again when a file is deleted", async () => {
    await holdSpace(env.USAGE_LEDGER, "released", { bytes: 900, ...ROOMY });
    await releaseSpace(env.USAGE_LEDGER, "released", 900);

    expect(await readUsage(env.USAGE_LEDGER, "released")).toEqual({
      bytes: 0,
      artifacts: 0,
    });
  });

  it("charges the second copy of a file nothing to keep", async () => {
    const twice = { digest: "d1", bytes: 500, ...ROOMY };
    const first = await attachBlob(env.USAGE_LEDGER, "dedup", {
      ...twice,
      artifactId: "a1",
    });
    const second = await attachBlob(env.USAGE_LEDGER, "dedup", {
      ...twice,
      artifactId: "a2",
    });

    expect(first.ok && first.store).toBe(true);
    expect(second.ok && second.store).toBe(false);
    expect(await readUsage(env.USAGE_LEDGER, "owner:dedup")).toEqual({
      bytes: 500,
      artifacts: 2,
    });
  });

  // The rule the sweep and the dedup have to be designed against together:
  // nothing may delete bytes another artifact is still serving.
  it("keeps the bytes while anything is still holding them", async () => {
    const shared = { digest: "d2", bytes: 100, ...ROOMY };
    await attachBlob(env.USAGE_LEDGER, "shared", {
      ...shared,
      artifactId: "a1",
    });
    await attachBlob(env.USAGE_LEDGER, "shared", {
      ...shared,
      artifactId: "a2",
    });

    const firstGone = await detachBlob(env.USAGE_LEDGER, "shared", "d2", "a1");
    const secondGone = await detachBlob(env.USAGE_LEDGER, "shared", "d2", "a2");

    expect(firstGone).toBe(false);
    expect(secondGone).toBe(true);
    expect(await readUsage(env.USAGE_LEDGER, "owner:shared")).toEqual({
      bytes: 0,
      artifacts: 0,
    });
  });

  it("counts a re-attach of the same artifact once", async () => {
    const same = { digest: "d3", bytes: 100, artifactId: "a1", ...ROOMY };
    await attachBlob(env.USAGE_LEDGER, "repeat", same);
    await attachBlob(env.USAGE_LEDGER, "repeat", same);

    expect(await detachBlob(env.USAGE_LEDGER, "repeat", "d3", "a1")).toBe(true);
  });

  it("keeps one owner's blobs out of another owner's ledger", async () => {
    const file = { digest: "d4", bytes: 100, artifactId: "a1", ...ROOMY };
    await attachBlob(env.USAGE_LEDGER, "owner-one", file);

    const other = await attachBlob(env.USAGE_LEDGER, "owner-two", file);

    expect(other.ok && other.store).toBe(true);
  });

  it("never goes below empty, however many releases arrive", async () => {
    await releaseSpace(env.USAGE_LEDGER, "over-released", 5000);

    expect(await readUsage(env.USAGE_LEDGER, "over-released")).toEqual({
      bytes: 0,
      artifacts: 0,
    });
  });
});
