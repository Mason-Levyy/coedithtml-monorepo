import { TUTORIAL_QUERY_PARAM } from "@/lib/protocol";

const VIEWER_PATH = /^\/a\/([0-9a-f]{32})\/?$/;

export function viewerTokenFromPath(pathname: string): string | null {
  return VIEWER_PATH.exec(pathname)?.[1] ?? null;
}

export function isTutorialViewer(search: string): boolean {
  return new URLSearchParams(search).get(TUTORIAL_QUERY_PARAM) === "1";
}
