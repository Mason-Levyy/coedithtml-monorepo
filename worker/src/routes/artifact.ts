import { getArtifactMetadata } from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { jsonError, jsonResponse } from "@/lib/responses";
import { artifactIdSchema } from "@/lib/schemas/artifact";

export async function handleGetArtifact(
  artifactId: string,
  env: WorkerEnv,
): Promise<Response> {
  const parsedId = artifactIdSchema.safeParse(artifactId);
  if (!parsedId.success) {
    return jsonError("Not found.", 404);
  }

  const lookup = await getArtifactMetadata(
    env.ARTIFACT_METADATA,
    parsedId.data,
  );
  if (!lookup.ok) {
    console.error("Failed to read artifact metadata", lookup.cause);
    return jsonError("Could not load the file. Try again.", 500);
  }
  if (lookup.metadata === null) {
    return jsonError("Not found.", 404);
  }

  return jsonResponse({ artifactId: parsedId.data, ...lookup.metadata }, 200);
}
