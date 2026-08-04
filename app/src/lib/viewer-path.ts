const VIEWER_PATH = /^\/a\/([0-9a-f]{32})\/?$/;

export function viewerTokenFromPath(pathname: string): string | null {
  return VIEWER_PATH.exec(pathname)?.[1] ?? null;
}
