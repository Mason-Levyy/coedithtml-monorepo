import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";

export const VIEWER_PATH_PREFIX = "/a/";

export const UNLOCK_QUERY_PARAM = "u";

// The link handed to a reader points at the app origin, never straight at the
// sandbox: the sandbox URL renders the bare artifact with no filmstrip, and
// opening untrusted markup top-level gives up the iframe's sandbox attributes.
export function viewerUrl(
  request: Request,
  env: WorkerEnv,
  token: string,
): string {
  return `${originFor(request, env.APP_HOST)}${VIEWER_PATH_PREFIX}${token}`;
}

export function artifactUrl(
  request: Request,
  env: WorkerEnv,
  token: string,
  grant: string | null = null,
): string {
  const base = `${originFor(request, env.SANDBOX_HOST)}/${token}`;
  if (grant === null || grant.length === 0) {
    return base;
  }
  return `${base}?${UNLOCK_QUERY_PARAM}=${encodeURIComponent(grant)}`;
}
