import {
  acceptUpload,
  chargeUploadAttempt,
  declaredBodyTooLarge,
  storeRevision,
  type AcceptedUpload,
} from "@/lib/accept-upload";
import {
  coeditStickiesIn,
  withoutCoeditPayload,
} from "@/lib/artifact-reimport";
import { putArtifactMetadata } from "@/lib/artifact-metadata";
import { revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { addOwnerArtifact } from "@/lib/owner-artifacts";
import { resolveOwnerId, withOwnerCookie } from "@/lib/owner-cookie";
import { hashArtifactPassword } from "@/lib/password";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";
import { rejectionResponse } from "@/lib/upload-rejection";
import { seedRoomWithEntries } from "@/lib/room-seed";
import { mintShareTokens, type ShareTokens } from "@/lib/share-tokens";
import { viewerUrl } from "@/lib/share-links";
import { newArtifactId } from "@/lib/storage-keys";

type StoredUpload =
  { ok: true; revision: string } | { ok: false; response: Response };

function bytesOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

async function storeUpload(
  env: WorkerEnv,
  artifactId: string,
  upload: AcceptedUpload,
  owner: { ownerId: string; uploadedAt: string },
  tokens?: ShareTokens,
): Promise<StoredUpload> {
  const revision = await revisionOf(upload.bytes);
  const failedToStore = await storeRevision(
    env,
    artifactId,
    revision,
    upload.bytes,
  );
  if (failedToStore) {
    return { ok: false, response: failedToStore };
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
      uploadedAt: owner.uploadedAt,
      revision,
      previousRevisions: [],
      ownerId: owner.ownerId,
      published: !upload.draft,
      ...(passwordHash === undefined ? {} : { passwordHash }),
      ...(tokens === undefined ? {} : { tokens }),
    },
  );
  if (!storedMetadata.ok) {
    console.error("Failed to store artifact metadata", storedMetadata.cause);
    return { ok: false, response: jsonError(SAVE_FAILED, 500) };
  }
  return { ok: true, revision };
}

export async function handleUpload(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (declaredBodyTooLarge(request)) {
    return rejectionResponse("too-large", 413);
  }

  const overLimit = await chargeUploadAttempt(request, env);
  if (overLimit) {
    return overLimit;
  }

  const accepted = await acceptUpload(request);
  if (!accepted.ok) {
    return accepted.response;
  }

  const { ownerId, isNew } = resolveOwnerId(request);

  const originalHtml = new TextDecoder().decode(accepted.upload.bytes);
  const cleanedHtml = withoutCoeditPayload(originalHtml);
  const upload =
    cleanedHtml === originalHtml
      ? accepted.upload
      : { ...accepted.upload, bytes: bytesOf(cleanedHtml) };

  const artifactId = newArtifactId();
  const uploadedAt = new Date().toISOString();

  let tokens: ShareTokens | undefined;
  if (!upload.draft) {
    const minted = await mintShareTokens(env, artifactId);
    if (!minted.ok) {
      return minted.response;
    }
    tokens = minted.tokens;
  }

  const stored = await storeUpload(
    env,
    artifactId,
    upload,
    { ownerId, uploadedAt },
    tokens,
  );
  if (!stored.ok) {
    return stored.response;
  }

  const restoredStickies = coeditStickiesIn(originalHtml, stored.revision);
  await Promise.all([
    seedRoomWithEntries(env, artifactId, restoredStickies),
    addOwnerArtifact(env.ARTIFACT_METADATA, ownerId, {
      artifactId,
      fileName: upload.fileName,
      size: upload.bytes.byteLength,
      uploadedAt,
      published: !upload.draft,
      hasPassword: upload.password !== null,
      ...tokens,
    }),
  ]);

  const body = tokens
    ? {
        artifactId,
        ...tokens,
        viewUrl: viewerUrl(request, env, tokens.viewToken),
        suggestUrl: viewerUrl(request, env, tokens.suggestToken),
        editUrl: viewerUrl(request, env, tokens.editToken),
        published: true,
        restoredComments: restoredStickies.length,
      }
    : {
        artifactId,
        fileName: upload.fileName,
        size: upload.bytes.byteLength,
        uploadedAt,
        draft: true,
        restoredComments: restoredStickies.length,
      };

  return withOwnerCookie(jsonResponse(body, 201), ownerId, isNew);
}
