import { revokeAccessToken } from "@/lib/access-tokens";
import type { WorkerEnv } from "@/lib/env";
import { ownsArtifact } from "@/lib/owned-artifact";
import { updateOwnerArtifact } from "@/lib/owner-artifacts";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";
import { TOKEN_FIELD } from "@/lib/room-capabilities";

export async function handleRevokeToken(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const resolved = await resolveArtifactByToken(env.ARTIFACT_METADATA, token);
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error("Failed to resolve the artifact", resolved.cause);
      return jsonError("Could not revoke the link. Try again.", 500);
    }
    return jsonError("Not found.", 404);
  }

  const { artifactId, metadata, record } = resolved.artifact;

  if (!ownsArtifact(metadata, request)) {
    return jsonError("Only the owner can revoke this link.", 403);
  }

  const revoked = await revokeAccessToken(env.ARTIFACT_METADATA, token);
  if (!revoked.ok) {
    console.error("Failed to revoke the access token", revoked.cause);
    return jsonError("Could not revoke the link. Try again.", 500);
  }

  if (metadata.ownerId) {
    await updateOwnerArtifact(
      env.ARTIFACT_METADATA,
      metadata.ownerId,
      artifactId,
      { [TOKEN_FIELD[record.kind]]: undefined },
    );
  }

  return jsonResponse({ revoked: true, kind: record.kind }, 200);
}
