Goal: Delivers clean, formatting-stripped text directly to agents instead of forcing them to scrape dense, complex webpage HTML layouts.

Issue: Site does not support Markdown for Agents

Fix: Implement content negotiation so requests with Accept: text/markdown return a markdown representation while HTML remains the default for browsers.

Skill: https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md

Docs: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/

# Implement API Catalog

Publish an API catalog for automated discovery per
[RFC 9727](https://www.rfc-editor.org/rfc/rfc9727).

## Requirements

- Serve `/.well-known/api-catalog` with `Content-Type: application/linkset+json` and HTTP 200
- Include a `linkset` array with entries for each API
- Each entry needs an `anchor` URL and link relations: `service-desc` (OpenAPI spec), `service-doc` (docs), and optionally `status` (health endpoint)
- See [RFC 9727 Appendix A](https://www.rfc-editor.org/rfc/rfc9727#appendix-A) for examples

## Validate

```
POST https://isitagentready.com/api/scan
Content-Type: application/json

{"url": "https://YOUR-SITE.com"}
```

Check that `checks.discovery.apiCatalog.status` is `"pass"`.

# Implement Link Response Headers

Add Link response headers to your homepage for agent discovery per
[RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) and
[RFC 9727 Section 3](https://www.rfc-editor.org/rfc/rfc9727#section-3).

## Requirements

- Return `Link` headers on your homepage response pointing to machine-readable resources
- Use registered relation types: `api-catalog`, `service-desc`, `service-doc`, `describedby`
- Example: `Link: </.well-known/api-catalog>; rel="api-catalog"`
- Multiple Link headers or comma-separated values are both valid

## Cloudflare

Use [Transform Rules](https://developers.cloudflare.com/rules/transform/) or
[Workers](https://developers.cloudflare.com/workers/) to add Link headers
without modifying your origin server.

## Validate

```
POST https://isitagentready.com/api/scan
Content-Type: application/json

{"url": "https://YOUR-SITE.com"}
```

Check that `checks.discoverability.linkHeaders.status` is `"pass"`.

# Skill: Implement Auth.md Agent Registration Discovery

## What This Skill Does

Helps a service publish Auth.md support for agent registration. Use this when a scanner reports the `authMd` check is failing or when adding the Auth.md standard to an API or application.

## Requirements

- Serve `/auth.md` from the service root as Markdown with an H1 heading that contains `auth.md` (for example, `# auth.md` or `# Example auth.md`).
- Prefer publishing OAuth Protected Resource Metadata at `/.well-known/oauth-protected-resource` for the resource server.
- Include `resource`, `authorization_servers`, `scopes_supported`, and `bearer_methods_supported` with `header` in the PRM document.
- Publish OAuth Authorization Server metadata at each advertised authorization server's `/.well-known/oauth-authorization-server` URL.
- Include a valid `issuer` in Authorization Server metadata and ensure it matches the issuer advertised in PRM.
- Add an `agent_auth` block with `skill`, `register_uri`, and at least one complete registration method when Authorization Server metadata is available.
- If OAuth metadata is not available, keep `/auth.md` self-contained: identify the agent audience, document registration or provisioning endpoint(s), list supported method(s), and explain credential use.

## Flow Metadata

- ID-JAG: include `identity_types_supported: ["identity_assertion"]`, `identity_assertion.assertion_types_supported` with `urn:ietf:params:oauth:token-type:id-jag`, and credential types. Include `revocation_uri` and the revocation event in `events_supported` when supported; scanners may warn when they are omitted, but they are not required for detection.
- Verified email: include `identity_assertion.assertion_types_supported` with `verified_email`, credential types, and `claim_uri`.
- Anonymous: include `identity_types_supported: ["anonymous"]`, `anonymous.credential_types_supported`, and `claim_uri`.

## Notes

Do not probe `POST /agent/auth` during passive scans. Registration can create accounts, send email, or issue credentials. Public discovery documents are the safe source of truth.

# Implement A2A Agent Card

Publish an A2A Agent Card for agent-to-agent discovery per the
[A2A Protocol Specification](https://a2a-protocol.org/latest/specification/).

## Requirements

- Serve JSON at `/.well-known/agent-card.json` with HTTP 200
- Include `name`, `version`, and `description`
- Include `supportedInterfaces` with service URL and transport protocol
- List `capabilities` and `skills` (each with `id`, `name`, `description`)

See [Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/)
for the full schema.

## Cloudflare

[Agents SDK](https://developers.cloudflare.com/agents/) supports building
A2A-compatible agents on Workers.

## Validate

```
POST https://isitagentready.com/api/scan
Content-Type: application/json

{"url": "https://YOUR-SITE.com"}
```

Check that `checks.discovery.a2aAgentCard.status` is `"pass"`.
