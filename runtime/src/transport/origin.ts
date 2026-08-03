declare global {
  interface Window {
    __coedit__?: { version: string; config?: { appOrigin?: unknown } };
  }
}

// The serving Worker writes the app origin into the config global. There is no
// fallback on purpose: document.referrer names whoever framed the artifact, so
// treating it as the app origin would let any page that embeds a link both read
// the bridge and issue commands into the document.
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
