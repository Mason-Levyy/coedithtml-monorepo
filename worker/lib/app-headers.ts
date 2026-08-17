// The app origin holds the owner cookie, the file list, and a revoke button,
// and until now it returned whatever the asset router handed back: no framing
// protection, no HSTS, no nosniff, no referrer policy.
//
// The CSP is deliberately not the artifact's. This origin serves our own build
// and nobody else's markup, so it can be strict -- and `frame-src` is what
// keeps the relationship one-directional: the app may frame the sandbox, and
// nothing may frame the app.
export function appContentSecurityPolicy(sandboxOrigin: string): string {
  return [
    "default-src 'self'",
    // Vite inlines a small style block, and the viewer sizes the frame by
    // style attribute. Scripts stay on 'self' -- no inline, no eval.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `frame-src ${sandboxOrigin}`,
    `connect-src 'self' ${sandboxOrigin} wss: ws:`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function appSecurityHeaders(sandboxOrigin: string): Headers {
  return new Headers({
    "content-security-policy": appContentSecurityPolicy(sandboxOrigin),
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "cross-origin-opener-policy": "same-origin",
  });
}

export function withAppSecurityHeaders(
  response: Response,
  sandboxOrigin: string,
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of appSecurityHeaders(sandboxOrigin)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
