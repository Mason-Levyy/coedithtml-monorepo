import { artifactObjectKey } from "./storage-keys";

export type StoreResult = { ok: true } | { ok: false; cause: unknown };

export type GetArtifactResult =
  { ok: true; bytes: ArrayBuffer | null } | { ok: false; cause: unknown };

export async function getArtifact(
  store: R2Bucket,
  artifactId: string,
): Promise<GetArtifactResult> {
  try {
    const object = await store.get(artifactObjectKey(artifactId));
    if (object === null) {
      return { ok: true, bytes: null };
    }
    return { ok: true, bytes: await object.arrayBuffer() };
  } catch (cause) {
    return { ok: false, cause };
  }
}

// Takes the raw bytes rather than decoded text: re-encoding is how byte
// fidelity is lost, and the whole product rests on returning what was given.
export async function putArtifact(
  store: R2Bucket,
  artifactId: string,
  bytes: ArrayBuffer,
): Promise<StoreResult> {
  try {
    await store.put(artifactObjectKey(artifactId), bytes, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}
