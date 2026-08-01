import { artifactObjectKey } from "./storage-keys";

export type StoreResult = { ok: true } | { ok: false; cause: unknown };

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
