import { revokeAccessToken } from "@/lib/access-tokens";
import {
  deleteArtifactMetadata,
  putArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { deleteArtifact, deleteObject } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { requireOwnedArtifact } from "@/lib/owned-artifact";
import {
  removeOwnerArtifact,
  updateOwnerArtifact,
} from "@/lib/owner-artifacts";
import { nextPasswordHash } from "@/lib/password";
import { parseJsonBody } from "@/lib/request-body";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";
import { TOKEN_FIELD, TOKEN_KINDS } from "@/lib/room-capabilities";
import { passwordUpdateBodySchema } from "@/lib/schemas/artifact";
import { blobObjectKey } from "@/lib/storage-keys";
import { detachBlob, GLOBAL_LEDGER, releaseSpace } from "@/lib/usage";

export async function handleUpdateArtifactSettings(
  artifactId: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const owned = await requireOwnedArtifact(
    env.ARTIFACT_METADATA,
    artifactId,
    request,
    "Only the owner can manage this artifact.",
  );
  if (!owned.ok) {
    return owned.response;
  }
  const metadata = owned.metadata;

  const parsedBody = await parseJsonBody(request, passwordUpdateBodySchema);
  if (!parsedBody.ok) {
    return jsonError("Invalid request body.", 400);
  }

  const passwordHash = await nextPasswordHash(
    metadata.passwordHash,
    parsedBody.body.password,
  );

  const stored = await putArtifactMetadata(env.ARTIFACT_METADATA, artifactId, {
    ...metadata,
    passwordHash,
  });
  if (!stored.ok) {
    console.error("Failed to store updated metadata", stored.cause);
    return jsonError(SAVE_FAILED, 500);
  }

  if (metadata.ownerId) {
    await updateOwnerArtifact(
      env.ARTIFACT_METADATA,
      metadata.ownerId,
      artifactId,
      { hasPassword: passwordHash !== undefined },
    );
  }

  return jsonResponse(
    { updated: true, hasPassword: passwordHash !== undefined },
    200,
  );
}

// Bytes go only when nothing else is holding them. The ledger is what knows,
// and it is asked rather than guessed at, because the failure mode of guessing
// is taking a document out from under somebody who is reading it.
async function releaseBlobs(
  env: WorkerEnv,
  metadata: ArtifactMetadata,
  artifactId: string,
): Promise<void> {
  const ownerId = metadata.ownerId;
  if (ownerId === undefined) {
    return;
  }
  const digests = new Set(Object.values(metadata.blobs));
  for (const digest of digests) {
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

export async function handleDeleteArtifact(
  artifactId: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const owned = await requireOwnedArtifact(
    env.ARTIFACT_METADATA,
    artifactId,
    request,
    "Only the owner can delete this artifact.",
  );
  if (!owned.ok) {
    return owned.response;
  }
  const metadata = owned.metadata;

  const liveTokens = TOKEN_KINDS.map(
    (kind) => metadata.tokens?.[TOKEN_FIELD[kind]],
  ).filter((token): token is string => token !== undefined);

  const everyRevision = [metadata.revision, ...metadata.previousRevisions];
  await Promise.all([
    ...everyRevision
      .filter((revision) => metadata.blobs[revision] === undefined)
      .map((revision) =>
        deleteArtifact(env.ARTIFACT_STORE, artifactId, revision),
      ),
    ...liveTokens.map((token) =>
      revokeAccessToken(env.ARTIFACT_METADATA, token),
    ),
    deleteArtifactMetadata(env.ARTIFACT_METADATA, artifactId),
  ]);

  if (metadata.ownerId) {
    await removeOwnerArtifact(
      env.ARTIFACT_METADATA,
      metadata.ownerId,
      artifactId,
    );
    await releaseBlobs(env, metadata, artifactId);
  }

  return jsonResponse({ deleted: true }, 200);
}
