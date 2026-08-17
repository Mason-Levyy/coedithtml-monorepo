import {
  artifactMetadataSchema,
  putArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { eraseArtifact } from "@/lib/erase-artifact";
import { expiresAtOf, verdictFor } from "@/lib/expiry";
import { updateOwnerArtifact } from "@/lib/owner-artifacts";
import { roomIsEmpty } from "@/lib/room-seed";

// A cron gets a wall-clock budget, not an unlimited one, so the sweep takes a
// bounded bite and leaves the rest for the next run. Nothing here has to
// finish in one pass; an artifact a day past its expiry is not a problem, and
// a sweep that times out halfway through with no record of where it got to is.
const ARTIFACTS_PER_RUN = 500;

const ARTIFACT_PREFIX = "artifacts/";

export type SweepReport = {
  examined: number;
  expired: number;
  warned: number;
};

function artifactIdIn(key: string): string | null {
  const id = key.slice(ARTIFACT_PREFIX.length);
  return id.includes("/") || id.length === 0 ? null : id;
}

async function metadataAt(
  kv: KVNamespace,
  key: string,
): Promise<ArtifactMetadata | null> {
  const raw = await kv.get(key);
  if (raw === null) {
    return null;
  }
  const parsed = artifactMetadataSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

async function warn(
  env: WorkerEnv,
  artifactId: string,
  metadata: ArtifactMetadata,
): Promise<boolean> {
  const expiresAt = expiresAtOf(metadata);
  if (metadata.expiresAt === expiresAt) {
    return false;
  }
  await putArtifactMetadata(env.ARTIFACT_METADATA, artifactId, {
    ...metadata,
    expiresAt,
  });
  if (metadata.ownerId) {
    await updateOwnerArtifact(
      env.ARTIFACT_METADATA,
      metadata.ownerId,
      artifactId,
      { expiresAt },
    );
  }
  return true;
}

export async function sweepArtifacts(
  env: WorkerEnv,
  now: number = Date.now(),
): Promise<SweepReport> {
  const listed = await env.ARTIFACT_METADATA.list({
    prefix: ARTIFACT_PREFIX,
    limit: ARTIFACTS_PER_RUN,
  });
  const report: SweepReport = { examined: 0, expired: 0, warned: 0 };

  for (const { name } of listed.keys) {
    const artifactId = artifactIdIn(name);
    if (artifactId === null) {
      continue;
    }
    const metadata = await metadataAt(env.ARTIFACT_METADATA, name);
    if (metadata === null) {
      continue;
    }
    report.examined += 1;

    const verdict = verdictFor(metadata, now);
    if (verdict === "idle") {
      await eraseArtifact(env, artifactId, metadata);
      report.expired += 1;
      continue;
    }
    // Nobody ever opened it, but somebody may still have written on it -- the
    // uploader marking up their own file in the first hour is the one case the
    // view count cannot see. The room is asked only about these.
    if (verdict === "unused" && (await roomIsEmpty(env, artifactId))) {
      await eraseArtifact(env, artifactId, metadata);
      report.expired += 1;
      continue;
    }
    if (verdict === "warn" && (await warn(env, artifactId, metadata))) {
      report.warned += 1;
    }
  }

  return report;
}
