import type { ArtifactMetadata } from "@/lib/artifact-metadata";
import {
  getObject,
  objectKeyFor,
  type GetArtifactResult,
} from "@/lib/artifact-store";

// Every view was a fresh R2 read, and a document sent to a room full of people
// is the same bytes read a hundred times over.
//
// What is cached is the bytes, never the authorization. The key is the artifact
// id and revision -- not the token -- so a revoked link is still resolved and a
// password gate is still checked on every single request; only the trip to R2
// is skipped. Nothing here changes what the browser is told to do with the
// response, because revocation has to mean revoked now.
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
  // Keyed on the object, so two artifacts sharing bytes share one cache entry
  // as well -- and so a revision that moved into the blob space is not read
  // back out of an entry filled from where it used to live.
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
