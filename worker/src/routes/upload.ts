import {
  acceptUpload,
  chargeUploadAttempt,
  declaredBodyTooLarge,
  type AcceptedUpload,
} from "@/lib/accept-upload";
import {
  coeditStickiesIn,
  withoutCoeditPayload,
} from "@/lib/artifact-reimport";
import { putArtifactMetadata } from "@/lib/artifact-metadata";
import { putObject } from "@/lib/artifact-store";
import { blobDigestOf, revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { addOwnerArtifact } from "@/lib/owner-artifacts";
import { resolveOwnerId, withOwnerCookie } from "@/lib/owner-cookie";
import { hashArtifactPassword } from "@/lib/password";
import { jsonError, jsonResponse, SAVE_FAILED } from "@/lib/responses";
import { rejectionResponse } from "@/lib/upload-rejection";
import { seedRoomWithEntries } from "@/lib/room-seed";
import { mintShareTokens, type ShareTokens } from "@/lib/share-tokens";
import { viewerUrl } from "@/lib/share-links";
import { blobObjectKey, newArtifactId } from "@/lib/storage-keys";
import {
  GLOBAL_LEDGER,
  GLOBAL_MAX_ARTIFACTS,
  GLOBAL_MAX_BYTES,
  attachBlob,
  detachBlob,
  holdSpace,
  OWNER_MAX_ARTIFACTS,
  OWNER_MAX_BYTES,
  releaseSpace,
} from "@/lib/usage";

type StoredUpload =
  { ok: true; revision: string } | { ok: false; response: Response };

function bytesOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

async function storeUpload(
  env: WorkerEnv,
  artifactId: string,
  upload: AcceptedUpload,
  owner: {
    ownerId: string;
    uploadedAt: string;
    digest: string;
    fresh: boolean;
  },
  tokens?: ShareTokens,
): Promise<StoredUpload> {
  const revision = await revisionOf(upload.bytes);
  // Bytes this owner already has are already correct, byte for byte -- the key
  // is their full content digest. Writing them again would cost storage to
  // produce a file identical to the one beside it.
  if (owner.fresh) {
    const written = await putObject(
      env.ARTIFACT_STORE,
      blobObjectKey(owner.ownerId, owner.digest),
      upload.bytes,
    );
    if (!written.ok) {
      console.error("Failed to store artifact", written.cause);
      return { ok: false, response: jsonError(SAVE_FAILED, 500) };
    }
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
      blobs: { [revision]: owner.digest },
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

const NO_ROOM_LEFT =
  "Coedit is holding as much as it can right now. Try again later.";
const OWNER_FULL =
  "You are storing as much as one person can. Delete a file to make room.";

type ClaimedSpace =
  { ok: true; fresh: boolean } | { ok: false; response: Response };

// The owner's ledger goes first because it is the one that knows whether these
// bytes are new. Charging the product for a copy of a file it already holds
// would make the global ceiling arrive early for everybody.
async function claimSpace(
  env: WorkerEnv,
  ownerId: string,
  artifactId: string,
  bytes: number,
  digest: string,
): Promise<ClaimedSpace> {
  const owner = await attachBlob(env.USAGE_LEDGER, ownerId, {
    digest,
    artifactId,
    bytes,
    maxBytes: OWNER_MAX_BYTES,
    maxArtifacts: OWNER_MAX_ARTIFACTS,
  });
  if (!owner.ok) {
    console.error("Failed to read the owner quota", owner.cause);
    return { ok: false, response: jsonError(SAVE_FAILED, 500) };
  }
  if (!owner.allowed) {
    return { ok: false, response: jsonError(OWNER_FULL, 507) };
  }

  const global = await holdSpace(env.USAGE_LEDGER, GLOBAL_LEDGER, {
    bytes: owner.store ? bytes : 0,
    maxBytes: GLOBAL_MAX_BYTES,
    maxArtifacts: GLOBAL_MAX_ARTIFACTS,
  });
  if (!global.ok || !global.allowed) {
    await detachBlob(env.USAGE_LEDGER, ownerId, digest, artifactId);
    if (!global.ok) {
      console.error("Failed to read the global ceiling", global.cause);
      return { ok: false, response: jsonError(SAVE_FAILED, 500) };
    }
    return { ok: false, response: jsonError(NO_ROOM_LEFT, 507) };
  }
  return { ok: true, fresh: owner.store };
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
  const digest = await blobDigestOf(upload.bytes);

  const room = await claimSpace(
    env,
    ownerId,
    artifactId,
    upload.bytes.byteLength,
    digest,
  );
  if (!room.ok) {
    return room.response;
  }

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
    { ownerId, uploadedAt, digest, fresh: room.fresh },
    tokens,
  );
  if (!stored.ok) {
    await detachBlob(env.USAGE_LEDGER, ownerId, digest, artifactId);
    if (room.fresh) {
      await releaseSpace(
        env.USAGE_LEDGER,
        GLOBAL_LEDGER,
        upload.bytes.byteLength,
      );
    }
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
