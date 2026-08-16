import { putArtifactMetadata } from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { requireOwnedArtifact } from "@/lib/owned-artifact";
import { updateOwnerArtifact } from "@/lib/owner-artifacts";
import { nextPasswordHash } from "@/lib/password";
import { parseJsonBody } from "@/lib/request-body";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";
import { passwordUpdateBodySchema } from "@/lib/schemas/artifact";
import { viewerUrl } from "@/lib/share-links";
import { mintShareTokens } from "@/lib/share-tokens";

export async function handlePublishArtifact(
  artifactId: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const owned = await requireOwnedArtifact(
    env.ARTIFACT_METADATA,
    artifactId,
    request,
    "Only the owner can publish this artifact.",
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

  let tokens = metadata.tokens;
  if (
    !tokens ||
    !tokens.viewToken ||
    !tokens.suggestToken ||
    !tokens.editToken
  ) {
    const minted = await mintShareTokens(env, artifactId);
    if (!minted.ok) {
      return minted.response;
    }
    tokens = minted.tokens;
  }

  const { viewToken, suggestToken, editToken } = tokens;
  if (!viewToken || !suggestToken || !editToken) {
    return jsonError(SAVE_FAILED, 500);
  }

  const stored = await putArtifactMetadata(env.ARTIFACT_METADATA, artifactId, {
    ...metadata,
    passwordHash,
    published: true,
    tokens,
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
      {
        published: true,
        hasPassword: passwordHash !== undefined,
        viewToken,
        suggestToken,
        editToken,
      },
    );
  }

  return jsonResponse(
    {
      artifactId,
      viewToken,
      suggestToken,
      editToken,
      viewUrl: viewerUrl(request, env, viewToken),
      suggestUrl: viewerUrl(request, env, suggestToken),
      editUrl: viewerUrl(request, env, editToken),
      published: true,
      hasPassword: passwordHash !== undefined,
    },
    200,
  );
}
