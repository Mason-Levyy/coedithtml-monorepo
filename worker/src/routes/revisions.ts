import {
  acceptUpload,
  chargeUploadAttempt,
  declaredBodyTooLarge,
  storeRevision,
  TOO_LARGE,
} from "@/lib/accept-upload";
import {
  putArtifactMetadata,
  withNewRevision,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";

const EDIT_ONLY = "This link cannot replace the file.";

export async function handleReplaceArtifact(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (declaredBodyTooLarge(request)) {
    return jsonError(TOO_LARGE, 413);
  }

  const resolved = await resolveArtifactByToken(env.ARTIFACT_METADATA, token);
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error("Failed to resolve the artifact", resolved.cause);
      return jsonError(SAVE_FAILED, 500);
    }
    return jsonError("Not found.", 404);
  }
  if (resolved.artifact.record.kind !== "edit") {
    return jsonError(EDIT_ONLY, 403);
  }

  const overLimit = await chargeUploadAttempt(request, env);
  if (overLimit) {
    return overLimit;
  }

  const accepted = await acceptUpload(request);
  if (!accepted.ok) {
    return accepted.response;
  }

  const { artifactId, metadata } = resolved.artifact;
  const { fileName, bytes } = accepted.upload;
  const revision = await revisionOf(bytes);
  if (revision === metadata.revision) {
    return jsonResponse({ revision, replaced: false }, 200);
  }

  const failedToStore = await storeRevision(env, artifactId, revision, bytes);
  if (failedToStore) {
    return failedToStore;
  }

  const next: ArtifactMetadata = withNewRevision(metadata, {
    fileName,
    size: bytes.byteLength,
    revision,
  });
  const storedMetadata = await putArtifactMetadata(
    env.ARTIFACT_METADATA,
    artifactId,
    next,
  );
  if (!storedMetadata.ok) {
    console.error("Failed to store artifact metadata", storedMetadata.cause);
    return jsonError(SAVE_FAILED, 500);
  }

  return jsonResponse({ revision, replaced: true }, 200);
}
