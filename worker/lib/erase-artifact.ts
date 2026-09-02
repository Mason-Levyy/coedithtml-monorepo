import { revokeAccessToken } from "@/lib/access-tokens";
import {
  deleteArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { deleteArtifact, deleteObject } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { removeOwnerArtifact } from "@/lib/owner-artifacts";
import { TOKEN_FIELD, TOKEN_KINDS } from "@/lib/room-capabilities";
import { wipeRoom } from "@/lib/room-seed";
import { blobObjectKey } from "@/lib/storage-keys";
import { detachBlob, GLOBAL_LEDGER, releaseSpace } from "@/lib/usage";

async function releaseBlobs(
  env: WorkerEnv,
  metadata: ArtifactMetadata,
  artifactId: string,
): Promise<void> {
  const ownerId = metadata.ownerId;
  if (ownerId === undefined) {
    return;
  }
  for (const digest of new Set(Object.values(metadata.blobs))) {
    const wasLast = await detachBlob(
      env.USAGE_LEDGER,
      ownerId,
      digest,
      artifactId,
    );
    if (wasLast) {
      await deleteObject(env.ARTIFACT_STORE, blobObjectKey(ownerId, digest));
      await releaseSpace(env.USAGE_LEDGER, GLOBAL_LEDGER, metadata.size);
    }
  }
}

export async function eraseArtifact(
  env: WorkerEnv,
  artifactId: string,
  metadata: ArtifactMetadata,
): Promise<void> {
  const liveTokens = TOKEN_KINDS.map(
    (kind) => metadata.tokens?.[TOKEN_FIELD[kind]],
  ).filter((token): token is string => token !== undefined);

  await Promise.all([
    ...[metadata.revision, ...metadata.previousRevisions]
      .filter((revision) => metadata.blobs[revision] === undefined)
      .map((revision) =>
        deleteArtifact(env.ARTIFACT_STORE, artifactId, revision),
      ),
    ...liveTokens.map((token) =>
      revokeAccessToken(env.ARTIFACT_METADATA, token),
    ),
    deleteArtifactMetadata(env.ARTIFACT_METADATA, artifactId),
    wipeRoom(env, artifactId),
  ]);

  if (metadata.ownerId) {
    await removeOwnerArtifact(
      env.ARTIFACT_METADATA,
      metadata.ownerId,
      artifactId,
    );
    await releaseBlobs(env, metadata, artifactId);
  }
}
