import { artifactObjectKey } from "./storage-keys";

export type StoreResult = { ok: true } | { ok: false; cause: unknown };

export type GetArtifactResult =
  { ok: true; bytes: ArrayBuffer | null } | { ok: false; cause: unknown };

export async function getArtifact(
  store: R2Bucket,
  artifactId: string,
  revision: string,
): Promise<GetArtifactResult> {
  try {
    const object = await store.get(artifactObjectKey(artifactId, revision));
    if (object === null) {
      return { ok: true, bytes: null };
    }
    return { ok: true, bytes: await object.arrayBuffer() };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export async function putArtifact(
  store: R2Bucket,
  artifactId: string,
  revision: string,
  bytes: ArrayBuffer,
): Promise<StoreResult> {
  try {
    await store.put(artifactObjectKey(artifactId, revision), bytes, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export async function deleteArtifact(
  store: R2Bucket,
  artifactId: string,
  revision: string,
): Promise<StoreResult> {
  try {
    await store.delete(artifactObjectKey(artifactId, revision));
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}
