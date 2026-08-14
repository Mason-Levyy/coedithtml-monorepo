import type { StartAuthoring } from "../author/contract";

declare global {
  interface Window {
    __coedit__?: {
      version: string;
      config?: { appOrigin?: unknown; revision?: unknown };
      author?: StartAuthoring;
    };
  }
}

export function resolveAppOrigin(): string | null {
  const configured = window.__coedit__?.config?.appOrigin;
  if (typeof configured !== "string" || configured.length === 0) {
    return null;
  }
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}
