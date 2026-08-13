import {
  acceptUpload,
  chargeUploadAttempt,
  declaredBodyTooLarge,
  storeRevision,
  SAVE_FAILED,
  TOO_LARGE,
  type AcceptedUpload,
  type Rejected,
} from "@/lib/accept-upload";
import { putAccessToken } from "@/lib/access-tokens";
import { putArtifactMetadata } from "@/lib/artifact-metadata";
import { revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { hashArtifactPassword } from "@/lib/password";
import { jsonError, jsonResponse } from "@/lib/responses";
import { viewerUrl } from "@/lib/share-links";
import { newArtifactId, newToken } from "@/lib/storage-keys";

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

type ShareTokens = {
  viewToken: string;
  suggestToken: string;
  editToken: string;
};

async function mintShareTokens(
  env: WorkerEnv,
  artifactId: string,
): Promise<{ ok: true; tokens: ShareTokens } | Rejected> {
  const tokens: ShareTokens = {
    viewToken: newToken(),
    suggestToken: newToken(),
    editToken: newToken(),
  };
  const siblingTokens = {
    view: tokens.viewToken,
    suggest: tokens.suggestToken,
    edit: tokens.editToken,
  };
  const results = await Promise.all([
    putAccessToken(env.ARTIFACT_METADATA, tokens.viewToken, {
      artifactId,
      kind: "view",
      siblingTokens,
    }),
    putAccessToken(env.ARTIFACT_METADATA, tokens.suggestToken, {
      artifactId,
      kind: "suggest",
      siblingTokens,
    }),
    putAccessToken(env.ARTIFACT_METADATA, tokens.editToken, {
      artifactId,
      kind: "edit",
      siblingTokens,
    }),
  ]);

  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    console.error("Failed to store access tokens", failed.cause);
    return { ok: false, response: jsonError(SAVE_FAILED, 500) };
  }
  return { ok: true, tokens };
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
