// No scheme on the host: dev runs the app over http on app.localhost, and a
// scheme-qualified frame-ancestors source would fail to match there.
export function sandboxContentSecurityPolicy(appHost: string): string {
  return [
    `frame-ancestors ${appHost}`,
    "object-src 'none'",
    "base-uri 'none'",
    // The artifact may load whatever it likes from the open web, but it must
    // not be able to aim a form submission at an origin of ours.
    "form-action 'none'",
  ].join("; ");
}

export function sandboxHeaders(appHost: string): Headers {
  return new Headers({
    "content-security-policy": sandboxContentSecurityPolicy(appHost),
    "x-content-type-options": "nosniff",
    // The path carries the share token, so it must not ride along in a Referer
    // to whichever third-party resources the artifact pulls in.
    "referrer-policy": "no-referrer",
  });
}
