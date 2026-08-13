import type { WorkerEnv } from "@/lib/env";
import { unlockedArtifactPayload } from "@/lib/artifact-payload";
import { checkPasswordGate } from "@/lib/password-gate";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";
import { UNLOCK_QUERY_PARAM } from "@/lib/share-links";

const UNAVAILABLE = "Could not load the file. Try again.";

export async function handleGetArtifact(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const resolved = await resolveArtifactByToken(env.ARTIFACT_METADATA, token);
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error("Failed to resolve the artifact", resolved.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonError("Not found.", 404);
  }

  const { artifactId, metadata } = resolved.artifact;
  const grant = new URL(request.url).searchParams.get(UNLOCK_QUERY_PARAM);
  const gate = await checkPasswordGate(env.ARTIFACT_METADATA, {
    artifactId,
    passwordHash: metadata.passwordHash,
    grant,
  });
  if (!gate.ok) {
    if (gate.status === 500) {
      console.error("Failed to check the password gate", gate.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonResponse({ requiresPassword: true }, 200);
  }

  return jsonResponse(
    unlockedArtifactPayload(request, env, resolved.artifact, grant),
    200,
  );
}
