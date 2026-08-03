import { resolveAccessToken } from "@/lib/access-tokens";
import { getArtifactMetadata } from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { checkPasswordGate } from "@/lib/password-gate";
import { jsonError, jsonResponse } from "@/lib/responses";
import { accessTokenSchema } from "@/lib/schemas/artifact";

export async function handleGetArtifact(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const parsedToken = accessTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return jsonError("Not found.", 404);
  }

  const resolved = await resolveAccessToken(
    env.ARTIFACT_METADATA,
    parsedToken.data,
  );
  if (!resolved.ok) {
    console.error("Failed to resolve access token", resolved.cause);
    return jsonError("Could not load the file. Try again.", 500);
  }
  if (resolved.record === null) {
    return jsonError("Not found.", 404);
  }

  const lookup = await getArtifactMetadata(
    env.ARTIFACT_METADATA,
    resolved.record.artifactId,
  );
  if (!lookup.ok) {
    console.error("Failed to read artifact metadata", lookup.cause);
    return jsonError("Could not load the file. Try again.", 500);
  }
  if (lookup.metadata === null) {
    return jsonError("Not found.", 404);
  }

  const { passwordHash, ...publicMetadata } = lookup.metadata;
  const gate = await checkPasswordGate(env.ARTIFACT_METADATA, {
    artifactId: resolved.record.artifactId,
    request,
    passwordHash,
    providedPassword: new URL(request.url).searchParams.get("password"),
  });
  if (!gate.ok) {
    if (gate.status === 500) {
      console.error("Failed to check the password gate", gate.cause);
      return jsonError("Could not load the file. Try again.", 500);
    }
    return jsonError(gate.message, gate.status);
  }

  return jsonResponse(
    { artifactId: resolved.record.artifactId, ...publicMetadata },
    200,
  );
}
