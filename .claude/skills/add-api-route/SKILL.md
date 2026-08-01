---
name: add-api-route
description: Add a new HTTP API route to the Coedit Worker. Use whenever asked to add, create, or wire up an API endpoint/route in worker/ — covers where the Zod schema goes, the validate → authorize → act handler shape, and which test file to create alongside it.
---

Every Worker route in this repo follows the same three-phase shape, in this order, with nothing skipped:

**validate → authorize → act**

## 1. Validate

Define a Zod schema for the request body (and any path/query params that need parsing) before writing the handler. Per CLAUDE.md, every API request body gets a schema — no exceptions, no `as` casts to launder unvalidated input.

- Put the schema in `worker/lib/schemas/` (create the file if the module doesn't exist yet — one schema file per resource, e.g. `worker/lib/schemas/artifact.ts`).
- Export the inferred TypeScript type alongside the schema (`export type CreateArtifactInput = z.infer<typeof createArtifactSchema>`) so the handler and tests share one source of truth.
- In the handler, parse the request body with `schema.safeParse` (not `.parse`) so validation failure becomes a typed error response, not a thrown exception. Once parsed, trust the type — no re-checking fields downstream.

## 2. Authorize

Token parsing and authorization live in `worker/lib/` (not inline in the route handler). Per CLAUDE.md's security rules:

- View tokens and edit tokens are distinct — check that the route's required scope matches the token's actual scope, not just that a token was present.
- A token is scoped to one artifact — verify the token's artifact ID matches the artifact ID in the request path, not just that the token is valid in general.
- Reuse (or add to) the shared token-authorization helper in `worker/lib/` rather than writing ad hoc checks per route — this is exactly the kind of logic that belongs in a shared module per CLAUDE.md's "extract on the second use" rule.
- If authorization fails, return a typed 401/403 — never leak *why* a specific check failed (e.g. "token valid but wrong artifact" vs "token invalid") in the response body; that detail goes to logs only.

## 3. Act

Do the actual work — read/write storage, message a Durable Object, whatever the route is for. Use the storage-key helpers and response helpers already in `worker/lib/` rather than constructing keys or response shapes inline; if this route needs a new key pattern or response shape that doesn't exist yet, add it to `worker/lib/` so the next route can reuse it.

Handle failure explicitly at every `await` — no bare `try { } catch { }`. Errors returned to the client are typed and safe to display; internal detail (stack traces, storage errors, upstream failures) goes to logs, never the response body.

## Test file

Create a colocated Vitest file next to the route (`route.ts` → `route.test.ts`). Required coverage per CLAUDE.md:

- **Zod schema boundary**: valid body succeeds; missing/wrong-typed/extra fields are rejected with the expected typed error, not a 500.
- **Token authorization paths**: correct scope succeeds; wrong scope (edit token on a view-only action) is rejected; token for a *different* artifact is rejected; missing/malformed token is rejected.
- Use test doubles from a colocated `fakes.ts` (excluded from the build) rather than hitting real storage or Durable Objects — skip writing tests for pure presentational logic, but a route handler is never that.

## Wiring it up

Register the route where the other Worker routes are registered. Keep the handler itself small — if validate/authorize/act together push the file past ~50 lines, that's the budget signal to extract the `act` logic into its own function in `worker/lib/`, not to shrink the three-phase structure.
