import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { checkPasswordGate } from "@/lib/password-gate";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";
import { artifactUrl, UNLOCK_QUERY_PARAM } from "@/lib/share-links";

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
    // Not an error: the viewer needs to know to ask for a password, and the
    // file name is withheld until it has one.
    return jsonResponse({ requiresPassword: true }, 200);
  }

  return jsonResponse(
    {
      artifactId,
      fileName: metadata.fileName,
      size: metadata.size,
      uploadedAt: metadata.uploadedAt,
      requiresPassword: false,
      sandboxOrigin: originFor(request, env.SANDBOX_HOST),
      artifactUrl: artifactUrl(request, env, resolved.artifact.token, grant),
    },
    200,
  );
}
