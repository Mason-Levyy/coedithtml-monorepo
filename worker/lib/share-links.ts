import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";

export const VIEWER_PATH_PREFIX = "/a/";

export const UNLOCK_QUERY_PARAM = "u";

// Points at the app origin, never the sandbox: opening untrusted markup
// top-level gives up the iframe's sandbox attributes.
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
