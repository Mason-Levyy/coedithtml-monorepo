import { putArtifactMetadata } from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { requireOwnedArtifact } from "@/lib/owned-artifact";
import { updateOwnerArtifact } from "@/lib/owner-artifacts";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";
import { TOKEN_FIELD, type TokenKind } from "@/lib/room-capabilities";
import { viewerUrl } from "@/lib/share-links";
import { regenerateShareToken } from "@/lib/share-tokens";

export async function handleRegenerateLink(
  artifactId: string,
  kind: TokenKind,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const owned = await requireOwnedArtifact(
    env.ARTIFACT_METADATA,
    artifactId,
    request,
    "Only the owner can manage this artifact's links.",
  );
  if (!owned.ok) {
    return owned.response;
  }
  const metadata = owned.metadata;

  const regenerated = await regenerateShareToken(
    env,
    artifactId,
    kind,
    metadata.tokens ?? {},
  );
  if (!regenerated.ok) {
    return regenerated.response;
  }

  const stored = await putArtifactMetadata(env.ARTIFACT_METADATA, artifactId, {
    ...metadata,
    tokens: regenerated.tokens,
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
      { [TOKEN_FIELD[kind]]: regenerated.token },
    );
  }

  return jsonResponse(
    {
      kind,
      token: regenerated.token,
      url: viewerUrl(env, regenerated.token),
    },
    200,
  );
}
