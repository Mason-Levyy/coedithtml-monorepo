export {};

declare global {
  interface Window {
    __coedit__?: { version: string };
  }
}

if (typeof window !== "undefined") {
  window.__coedit__ = { version: "0.0.0" };
}
