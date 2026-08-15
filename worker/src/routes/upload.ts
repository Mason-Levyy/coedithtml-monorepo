import {
  acceptUpload,
  chargeUploadAttempt,
  declaredBodyTooLarge,
  storeRevision,
  TOO_LARGE,
  type AcceptedUpload,
} from "@/lib/accept-upload";
import { putArtifactMetadata } from "@/lib/artifact-metadata";
import { revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { hashArtifactPassword } from "@/lib/password";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";
import { mintShareTokens } from "@/lib/share-tokens";
import { viewerUrl } from "@/lib/share-links";
import { newArtifactId } from "@/lib/storage-keys";

async function storeUpload(
  env: WorkerEnv,
  artifactId: string,
  upload: AcceptedUpload,
): Promise<Response | null> {
  const revision = await revisionOf(upload.bytes);
  const failedToStore = await storeRevision(
    env,
    artifactId,
    revision,
    upload.bytes,
  );
  if (failedToStore) {
    return failedToStore;
  }

  const passwordHash =
    upload.password === null
      ? undefined
      : await hashArtifactPassword(upload.password);

  const storedMetadata = await putArtifactMetadata(
    env.ARTIFACT_METADATA,
    artifactId,
    {
      fileName: upload.fileName,
      size: upload.bytes.byteLength,
      uploadedAt: new Date().toISOString(),
      revision,
      previousRevisions: [],
      ...(passwordHash === undefined ? {} : { passwordHash }),
    },
  );
  if (!storedMetadata.ok) {
    console.error("Failed to store artifact metadata", storedMetadata.cause);
    return jsonError(SAVE_FAILED, 500);
  }
  return null;
}

export async function handleUpload(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (declaredBodyTooLarge(request)) {
    return jsonError(TOO_LARGE, 413);
  }

  const overLimit = await chargeUploadAttempt(request, env);
  if (overLimit) {
    return overLimit;
  }

  const accepted = await acceptUpload(request);
  if (!accepted.ok) {
    return accepted.response;
  }

  const artifactId = newArtifactId();
  const failedToStore = await storeUpload(env, artifactId, accepted.upload);
  if (failedToStore) {
    return failedToStore;
  }

  const minted = await mintShareTokens(env, artifactId);
  if (!minted.ok) {
    return minted.response;
  }

  const { viewToken, suggestToken, editToken } = minted.tokens;
  return jsonResponse(
    {
      artifactId,
      viewToken,
      suggestToken,
      editToken,
      viewUrl: viewerUrl(request, env, viewToken),
      suggestUrl: viewerUrl(request, env, suggestToken),
      editUrl: viewerUrl(request, env, editToken),
    },
    201,
  );
}
