import { UNLOCK_QUERY_PARAM } from "@/lib/protocol";

const REVISION_QUERY_PARAM = "r";
const RESET_QUERY_PARAM = "reset";

function withParam(src: string, name: string, value: string): string {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}${name}=${encodeURIComponent(value)}`;
}

export function artifactSrcFor(artifact: {
  artifactUrl: string;
  revision: string;
}): string {
  return withParam(
    artifact.artifactUrl,
    REVISION_QUERY_PARAM,
    artifact.revision,
  );
}

export function withoutUnlockGrant(src: string): string {
  const url = new URL(src);
  url.searchParams.delete(UNLOCK_QUERY_PARAM);
  return url.toString();
}

export function frameSrcFor(src: string, reset: number): string {
  return reset === 0 ? src : withParam(src, RESET_QUERY_PARAM, String(reset));
}
