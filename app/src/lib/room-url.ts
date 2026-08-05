import { UNLOCK_QUERY_PARAM } from "@/lib/protocol";

function grantFrom(artifactUrl: string): string | null {
  try {
    return new URL(artifactUrl).searchParams.get(UNLOCK_QUERY_PARAM);
  } catch {
    return null;
  }
}

export function roomUrl(options: {
  token: string;
  artifactUrl: string;
  origin: string;
}): string {
  const path = `/api/artifacts/${encodeURIComponent(options.token)}/room`;
  const url = new URL(`${options.origin}${path}`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  const grant = grantFrom(options.artifactUrl);
  if (grant !== null && grant.length > 0) {
    url.searchParams.set(UNLOCK_QUERY_PARAM, grant);
  }
  return url.toString();
}
