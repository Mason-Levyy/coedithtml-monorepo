import { originFor } from "@/lib/origins";

// A browser cannot be talked out of sending Origin on a cross-site request that
// changes something -- not from fetch, not from a form post, not from an
// artifact's own script. So an Origin that is present and wrong is the whole
// signal: refuse it. An Origin that is absent is not a browser, and a client
// that is not a browser carries no ambient cookie to abuse.
//
// This is the reason the owner cookie cannot be minted or rotated by anything
// running inside an artifact, and the reason POST /revisions -- multipart, and
// therefore preflight-free -- is not the one route any origin can fire.
export function isCrossOriginWrite(
  request: Request,
  config: { APP_HOST: string },
): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return false;
  }
  return origin !== originFor(request, config.APP_HOST);
}
