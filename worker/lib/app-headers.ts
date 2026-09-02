export function appContentSecurityPolicy(sandboxOrigin: string): string {
  return [
    "default-src 'self'",
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

export const DISCOVERY_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</.well-known/agent-card.json>; rel="agent-card"',
  '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</llms.txt>; rel="service-doc"',
  '</auth.md>; rel="describedby"',
].join(", ");

export function appSecurityHeaders(sandboxOrigin: string): Headers {
  return new Headers({
    "content-security-policy": appContentSecurityPolicy(sandboxOrigin),
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "cross-origin-opener-policy": "same-origin",
    link: DISCOVERY_LINK_HEADER,
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
