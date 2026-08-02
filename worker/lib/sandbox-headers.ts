// No scheme on the host: dev runs the app over http on app.localhost, and a
// scheme-qualified frame-ancestors source would fail to match there.
export function sandboxContentSecurityPolicy(appHost: string): string {
  return [
    `frame-ancestors ${appHost}`,
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
}
