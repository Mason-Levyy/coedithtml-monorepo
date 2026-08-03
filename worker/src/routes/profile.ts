import {
  putArtifactMetadata,
  readingProfileSchema,
} from "@/lib/artifact-metadata";
import type { WorkerEnv } from "@/lib/env";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";
import { z } from "zod";

const profileRequestSchema = z.object({ profile: readingProfileSchema });

const UNAVAILABLE = "Could not save the reading profile. Try again.";

// Edit token only: the profile decides how the deck is divided, so everyone
// opening the link sees the same slide numbers and a viewer must not be able
// to renumber the document for everyone else.
export async function handleSetProfile(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = profileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Choose Slides, Pages, or App.", 400);
  }

  const resolved = await resolveArtifactByToken(env.ARTIFACT_METADATA, token);
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error("Failed to resolve the artifact", resolved.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonError("Not found.", 404);
  }
  if (resolved.artifact.record.kind !== "edit") {
    return jsonError("This link cannot change the reading profile.", 403);
  }

  const stored = await putArtifactMetadata(
    env.ARTIFACT_METADATA,
    resolved.artifact.artifactId,
    { ...resolved.artifact.metadata, profile: parsed.data.profile },
  );
  if (!stored.ok) {
    console.error("Failed to store the reading profile", stored.cause);
    return jsonError(UNAVAILABLE, 500);
  }

  return jsonResponse({ profile: parsed.data.profile }, 200);
}
