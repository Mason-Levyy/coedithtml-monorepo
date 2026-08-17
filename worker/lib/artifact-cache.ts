import { getArtifact, type GetArtifactResult } from "@/lib/artifact-store";

// Every view was a fresh R2 read, and a document sent to a room full of people
// is the same bytes read a hundred times over.
//
// What is cached is the bytes, never the authorization. The key is the artifact
// id and revision -- not the token -- so a revoked link is still resolved and a
// password gate is still checked on every single request; only the trip to R2
// is skipped. Nothing here changes what the browser is told to do with the
// response, because revocation has to mean revoked now.
const CACHE_SECONDS = 300;

function cacheKeyFor(artifactId: string, revision: string): string {
  return `https://artifact-bytes.invalid/${artifactId}/${revision}`;
}

function edgeCache(): Cache | null {
  return typeof caches === "undefined" ? null : caches.default;
}

export async function readArtifactBytes(
  store: R2Bucket,
  artifactId: string,
  revision: string,
): Promise<GetArtifactResult> {
  const cache = edgeCache();
  const key = cacheKeyFor(artifactId, revision);

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

  const result = await getArtifact(store, artifactId, revision);
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
