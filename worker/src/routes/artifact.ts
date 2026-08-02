import { resolveAccessToken } from "@/lib/access-tokens";
import { getArtifactMetadata } from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { jsonError, jsonResponse } from "@/lib/responses";
import { accessTokenSchema } from "@/lib/schemas/artifact";

export async function handleGetArtifact(
  token: string,
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

  return jsonResponse(
    { artifactId: resolved.record.artifactId, ...lookup.metadata },
    200,
  );
}
