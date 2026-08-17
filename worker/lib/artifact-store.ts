import type { ArtifactMetadata } from "./artifact-metadata";
import { artifactObjectKey, blobObjectKey } from "./storage-keys";

// Where one revision of one artifact actually lives. A revision listed in
// `blobs` was stored under its full content digest and may be shared with
// another artifact of the same owner; one that is not predates dedup and sits
// where it was written. Every read goes through here so the two layouts stay a
// lookup rather than a thing to remember.
export function objectKeyFor(
  artifactId: string,
  revision: string,
  metadata: Pick<ArtifactMetadata, "blobs" | "ownerId">,
): string {
  const digest = metadata.blobs[revision];
  if (digest === undefined || metadata.ownerId === undefined) {
    return artifactObjectKey(artifactId, revision);
  }
  return blobObjectKey(metadata.ownerId, digest);
}

export type StoreResult = { ok: true } | { ok: false; cause: unknown };

export type GetArtifactResult =
  { ok: true; bytes: ArrayBuffer | null } | { ok: false; cause: unknown };

export async function getObject(
  store: R2Bucket,
  key: string,
): Promise<GetArtifactResult> {
  try {
    const object = await store.get(key);
    if (object === null) {
      return { ok: true, bytes: null };
    }
    return { ok: true, bytes: await object.arrayBuffer() };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export async function putObject(
  store: R2Bucket,
  key: string,
  bytes: ArrayBuffer,
): Promise<StoreResult> {
  try {
    await store.put(key, bytes, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export async function deleteObject(
  store: R2Bucket,
  key: string,
): Promise<StoreResult> {
  try {
    await store.delete(key);
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export function getArtifact(
  store: R2Bucket,
  artifactId: string,
  revision: string,
): Promise<GetArtifactResult> {
  return getObject(store, artifactObjectKey(artifactId, revision));
}

export function putArtifact(
  store: R2Bucket,
  artifactId: string,
  revision: string,
  bytes: ArrayBuffer,
): Promise<StoreResult> {
  return putObject(store, artifactObjectKey(artifactId, revision), bytes);
}

export function deleteArtifact(
  store: R2Bucket,
  artifactId: string,
  revision: string,
): Promise<StoreResult> {
  return deleteObject(store, artifactObjectKey(artifactId, revision));
}
