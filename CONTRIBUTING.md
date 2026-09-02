# Contributing to coeditHTML

Thanks for looking. This is a small codebase with a few load-bearing rules, and
most of a review is checking a change against them.

## Before you start

Open an issue first for anything larger than a bug fix. The
[roadmap](planning/ROADMAP.md) says what is already planned and, more usefully,
what has been deliberately cut and why.

## Setup

Node 22+ and pnpm. Never `npm` or `yarn` — a stray lockfile breaks the build.

```bash
pnpm install
pnpm dev          # app + worker at http://app.localhost:8787
```

## Before you open a PR

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter runtime run check-size
```

CI runs exactly these, in that order. `pnpm build` has to come before `pnpm
test` — the Worker's tests load assets that the build assembles.

On Windows, the Worker's test run can exit 1 after every test passed: the
workers pool cannot unlink its SQLite files when it deletes its temp directory.
`worker/run-tests.mjs` recognises that one failure and nothing else. Do not
widen it.

## The rules a review will check

**Never parse the artifact.** It is somebody else's application and it runs
exactly as its author built it. We store the bytes, serve the bytes, and append
one script tag. A feature that needs to understand the user's markup is the
wrong feature.

**Two origins, no CORS.** Artifacts are served from a sandbox origin that never
receives a credential. Every cross-origin interaction is a same-origin fetch or
an origin-checked `postMessage`. Adding an `Access-Control-Allow-Origin` header
to reach the API from somewhere else is the wrong fix.

**The injected runtime is the highest-risk code in the repo.** It runs inside
someone else's document, so: zero dependencies, one namespaced global, all UI in
a shadow root, and it fails open — if the websocket dies or the runtime throws,
the artifact must still render and read correctly. A broken editor is
acceptable; a broken document is not.

Bundle budgets live in `runtime/check-bundle-size.mjs` and are the only place
the numbers exist. `runtime.js` ships to everyone who opens a link; `author.js`
loads only for writers. Anything only a writer can reach belongs in
`author.js`. A PR that raises a budget needs a reason in its description.

**Validate at the edge.** Zod schemas for every API request body, every Durable
Object message, and every environment binding. Parse, then trust the type. No
`as` casts to launder unvalidated input.

**Errors are values.** Every async handler handles failure explicitly. No bare
`try { ... } catch {}`. What we return to a client is typed and safe to display;
internal detail goes to logs.

**TypeScript, strict, no `any`.** Use `unknown` and narrow. No `.js` source
files. No `@ts-expect-error` without a one-line reason.

**Comments are a smell.** If a comment is needed to explain what a block does,
rename things or split the function. The comments that survive review explain
why a non-obvious constraint exists.

## Tests

Vitest, colocated with source. Test doubles live in `fakes.ts` files, excluded
from the build. The Worker's tests run through `worker/run-tests.mjs`, not
vitest directly.

Coverage is required for Zod schema boundaries, Durable Object state
transitions — especially concurrent edits and reconnects — and token
authorization paths. Purely presentational components do not need tests.

## Commits and PRs

Keep a PR to one change. Say in the description what rule above the change
brushes against, if any; that is the part a reviewer cannot reconstruct from the
diff.
