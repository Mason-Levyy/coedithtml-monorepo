export function sandboxContentSecurityPolicy(appHost: string): string {
  return [
    `frame-ancestors ${appHost}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

export function sandboxHeaders(appHost: string): Headers {
  return new Headers({
    "content-security-policy": sandboxContentSecurityPolicy(appHost),
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
}
