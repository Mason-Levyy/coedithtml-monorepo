declare global {
  interface Window {
    __coedit_config__?: { appOrigin?: unknown };
  }
}

// Config global first, document.referrer as fallback: can't read the parent's origin any other way from inside a cross-origin iframe.
export function resolveAppOrigin(): string | null {
  const configured = window.__coedit_config__?.appOrigin;
  if (typeof configured === "string" && configured.length > 0) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to referrer
    }
  }

  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      return null;
    }
  }

  return null;
}
