# Security Policy

## Reporting a vulnerability

Email **team@coedithtml.com**. Do not open a public issue.

Include what you can reproduce and the impact you believe it has. You will get
an acknowledgement within three business days. Please give us a chance to ship a
fix before disclosing publicly.

## What we consider high severity

coeditHTML hosts untrusted third-party HTML with scripts enabled, so the
interesting boundaries are narrow and specific:

- **Origin isolation.** Anything that gets artifact content executing on the app
  origin, or that gets a credential onto the sandbox origin. This is the failure
  that turns into stored XSS against every user.
- **Token scoping.** A share token that reaches an artifact it was not issued
  for, survives revocation, or grants write access from a view token.
- **Ownership.** Any path that reads or mutates an artifact without passing the
  ownership check.
- **Ceilings.** Bypassing upload size limits, rate limits, or room ceilings in a
  way that lets one caller exhaust storage or a Durable Object.

## Out of scope

- Anything an artifact's own author does inside their own artifact. The artifact
  runs as its author built it, sandboxed on its own origin — that is the design,
  not a bug.
- Reports from automated scanners with no demonstrated impact.
- Missing headers on the sandbox origin that do not cross an isolation boundary.

## Deployments you run yourself

If you deploy your own instance, `APP_HOST` and `SANDBOX_HOST` must be different
origins. Pointing both at one hostname makes every uploaded file stored XSS
against your own users. Nothing in the code prevents you from configuring it
that way, and no report about a single-origin deployment is a vulnerability in
this project.
