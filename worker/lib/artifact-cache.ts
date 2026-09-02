import type { ArtifactMetadata } from "@/lib/artifact-metadata";
import {
  getObject,
  objectKeyFor,
  type GetArtifactResult,
} from "@/lib/artifact-store";

const CACHE_SECONDS = 300;

function edgeCache(): Cache | null {
  return typeof caches === "undefined" ? null : caches.default;
}

export async function readArtifactBytes(
  store: R2Bucket,
  artifactId: string,
  revision: string,
  metadata: Pick<ArtifactMetadata, "blobs" | "ownerId">,
): Promise<GetArtifactResult> {
  const cache = edgeCache();
  const objectKey = objectKeyFor(artifactId, revision, metadata);
  const key = `https://artifact-bytes.invalid/${objectKey}`;

  if (cache !== null) {
    try {
      const hit = await cache.match(key);
      if (hit !== undefined) {
        return { ok: true, bytes: await hit.arrayBuffer() };
      }
    } catch (cause) {
      console.error("Failed to read the artifact cache", cause);
    }
  }

  const result = await getObject(store, objectKey);
  if (cache !== null && result.ok && result.bytes !== null) {
    try {
      await cache.put(
        key,
        new Response(result.bytes, {
          headers: { "cache-control": `max-age=${CACHE_SECONDS}` },
        }),
      );
    } catch (cause) {
      console.error("Failed to fill the artifact cache", cause);
    }
  }
  return result;
}
