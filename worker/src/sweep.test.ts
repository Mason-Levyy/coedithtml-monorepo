import { describe, expect, it } from "vitest";
import type { ArtifactMetadata } from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import {
  liveKv,
  recordingArtifactStore,
  recordingDocRoom,
  testWorkerEnv,
} from "@/lib/fakes";
import { IDLE_DAYS, UNUSED_DAYS } from "@/lib/expiry";
import { sweepArtifacts } from "./sweep";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-16T12:00:00.000Z");
const OWNER = "e".repeat(32);

function daysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}

function artifact(overrides: Partial<ArtifactMetadata> = {}): ArtifactMetadata {
  return {
    fileName: "deck.html",
    size: 1024,
    uploadedAt: daysAgo(1),
    revision: "aaaa1111bbbb2222",
    previousRevisions: [],
    blobs: {},
    meaningfulViews: 1,
    published: true,
    ownerId: OWNER,
    tokens: { viewToken: "v".repeat(32) },
    ...overrides,
  };
}

async function envHolding(
  held: Record<string, ArtifactMetadata>,
  room = recordingDocRoom(),
): Promise<{
  env: WorkerEnv;
  kv: KVNamespace;
  store: ReturnType<typeof recordingArtifactStore>;
}> {
  const kv = liveKv();
  for (const [artifactId, metadata] of Object.entries(held)) {
    await kv.put(`artifacts/${artifactId}`, JSON.stringify(metadata));
  }
  const store = recordingArtifactStore();
  const env = testWorkerEnv({
    ARTIFACT_METADATA: kv,
    ARTIFACT_STORE: store.bucket,
    DOC_ROOM: room.namespace,
  });
  return { env, kv, store };
}

describe("sweeping what nobody kept", () => {
  it("leaves a file that is being read alone", async () => {
    const { env, kv } = await envHolding({
      a1: artifact({ lastViewedAt: daysAgo(2) }),
    });

    const report = await sweepArtifacts(env, NOW);

    expect(report).toMatchObject({ examined: 1, expired: 0, warned: 0 });
    expect(await kv.get("artifacts/a1")).not.toBe(null);
  });

  it("takes a file nobody has opened in a month", async () => {
    const { env, kv } = await envHolding({
      a1: artifact({
        uploadedAt: daysAgo(60),
        lastViewedAt: daysAgo(IDLE_DAYS + 2),
      }),
    });

    const report = await sweepArtifacts(env, NOW);

    expect(report.expired).toBe(1);
    expect(await kv.get("artifacts/a1")).toBe(null);
  });

  it("revokes the links of what it took", async () => {
    const { env, kv } = await envHolding({
      a1: artifact({ uploadedAt: daysAgo(60), lastViewedAt: daysAgo(60) }),
    });
    await kv.put(`tokens/${"v".repeat(32)}`, "{}");

    await sweepArtifacts(env, NOW);

    expect(await kv.get(`tokens/${"v".repeat(32)}`)).toBe(null);
  });

  // Revoking every token used to make an artifact permanently unreachable and
  // permanently stored. The room was the loudest part of that.
  it("wipes the room of what it took, rather than leaving it standing", async () => {
    const room = recordingDocRoom();
    const { env } = await envHolding(
      { a1: artifact({ uploadedAt: daysAgo(60), lastViewedAt: daysAgo(60) }) },
      room,
    );

    await sweepArtifacts(env, NOW);

    const paths = room.connects.map(
      (connect) => new URL(connect.request.url).pathname,
    );
    expect(paths).toContain("/wipe");
  });

  it("takes a week-old file nobody ever opened, once its room is empty", async () => {
    const { env, kv } = await envHolding({
      a1: artifact({
        uploadedAt: daysAgo(UNUSED_DAYS + 1),
        meaningfulViews: 0,
      }),
    });

    const report = await sweepArtifacts(env, NOW);

    expect(report.expired).toBe(1);
    expect(await kv.get("artifacts/a1")).toBe(null);
  });

  it("warns the owner before the sweep, on the file itself", async () => {
    const { env, kv } = await envHolding({
      a1: artifact({ lastViewedAt: daysAgo(IDLE_DAYS - 2) }),
    });

    const report = await sweepArtifacts(env, NOW);
    const stored = JSON.parse(
      (await kv.get("artifacts/a1")) ?? "{}",
    ) as ArtifactMetadata;

    expect(report.warned).toBe(1);
    expect(stored.expiresAt).toBe(new Date(NOW + 2 * DAY).toISOString());
  });

  it("does not warn twice about the same date", async () => {
    const { env } = await envHolding({
      a1: artifact({ lastViewedAt: daysAgo(IDLE_DAYS - 2) }),
    });

    await sweepArtifacts(env, NOW);
    const second = await sweepArtifacts(env, NOW);

    expect(second.warned).toBe(0);
  });

  it("walks past a key that is not an artifact record", async () => {
    const { env, kv } = await envHolding({});
    await kv.put("artifacts/a1/9f2c", "not metadata");

    const report = await sweepArtifacts(env, NOW);

    expect(report.examined).toBe(0);
  });
});
