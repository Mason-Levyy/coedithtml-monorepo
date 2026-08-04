import { revokeAccessToken } from "@/lib/access-tokens";
import type { WorkerEnv } from "@/lib/env";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";

// Revoking one token leaves the other working: the view and edit links for an
// artifact are separate capabilities, and killing a leaked view link must not
// cost the owner their own edit link.
export async function handleRevokeToken(
  token: string,
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

  const revoked = await revokeAccessToken(env.ARTIFACT_METADATA, token);
  if (!revoked.ok) {
    console.error("Failed to revoke the access token", revoked.cause);
    return jsonError("Could not revoke the link. Try again.", 500);
  }

  return jsonResponse(
    { revoked: true, kind: resolved.artifact.record.kind },
    200,
  );
}
