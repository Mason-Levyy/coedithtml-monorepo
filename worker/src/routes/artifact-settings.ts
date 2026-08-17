import { putArtifactMetadata } from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { eraseArtifact } from "@/lib/erase-artifact";
import { requireOwnedArtifact } from "@/lib/owned-artifact";
import { updateOwnerArtifact } from "@/lib/owner-artifacts";
import { nextPasswordHash } from "@/lib/password";
import { parseJsonBody } from "@/lib/request-body";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";
import { passwordUpdateBodySchema } from "@/lib/schemas/artifact";

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
  await eraseArtifact(env, artifactId, owned.metadata);

  return jsonResponse({ deleted: true }, 200);
}
