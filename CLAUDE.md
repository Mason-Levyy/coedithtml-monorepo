# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

Coedit turns a single-file HTML artifact into a shareable link that other people
can edit, redline, and comment on. Upload the file an AI tool generated, get a
URL, send it to non-technical stakeholders. They edit in the browser. No account,
no build step, no framework knowledge required.

The core trick: **we never parse or rewrite the artifact.** We store the uploaded
HTML byte-for-byte and inject a small editor runtime at serve time. If a change
requires understanding the user's markup, it is probably the wrong change.

## Structure

- `app/` — the Coedit web app: upload, viewer, comment rail, and the owner's own
  file list and share settings. React + Vite.
- `worker/` — Cloudflare Worker: API routes, artifact serving, Durable Objects
  holding per-document state and websocket fanout. **All backend logic lives here.**
- `runtime/` — the injected editor script. Built standalone, zero dependencies.
- `protocol/` — the shared vocabulary both sides of the wire agree on: anchors,
  overlay entries, room messages, and the markdown export. **Dependency-free and
  DOM-free, always.** `runtime/` imports it directly, so a Zod import here lands
  inside the injected script; the parsers here are hand-written and the worker
  wraps them in its own Zod schemas.
- `website/` — marketing site at the apex. Next.js static export
  (`output: "export"`), served by `website/wrangler.jsonc`. No app logic.

## Artifact Conventions

- Input format is a **single HTML file** with inline CSS and JS. Reject JSX,
  multi-file uploads, and anything needing a build step at the boundary — do not
  add a bundler to accommodate them.
- **We do not parse the artifact.** It is somebody else's application and it
  runs exactly as its author built it — its own layout, navigation, and key
  handling. We host it, share it, and frame it. Anything that needs to
  understand the artifact's structure to work is the wrong feature.

## Code Standards

**Validation.** Zod schemas for every API request body, every Durable Object
message, and every environment binding. Parse at the edge, then trust the type.
No `as` casts to launder unvalidated input.

**Errors are values.** Every async handler explicitly handles failure. No bare
`try { ... } catch {}`. Errors returned to clients are typed and safe to display;
internal detail goes to logs, never the response body.

**Small modules, honest names.** A file that needs "and" to describe it should be
two files. Prefer pure functions taking explicit arguments over shared mutable
state.

**TypeScript everywhere, pnpm always.** No `.js` source files. `strict` is on and
stays on. No `any` — use `unknown` and narrow. No `@ts-expect-error` without a
one-line reason. Never invoke npm or yarn; this is a pnpm workspace and a stray
lockfile breaks the build.

**Attempt to avoid all comments when possible.** Do not restate what the code says —
if a comment is needed to explain *what* a block does, rename things or split the
function instead. No commented-out code, no changelog comments, no section-banner comments. Delete dead code.

**Extract on the second use, not the first.** Don't build abstractions for
hypothetical needs, but the moment logic appears twice, pull it out. Concrete
homes for it:

- `worker/lib/` — token parsing and authorization, Zod schemas, storage keys,
  response helpers. Route handlers should read as validate → authorize → act.
- `app/src/hooks/` — anything stateful and reusable: `useArtifact`,
  `usePresence`, `useShareLink`. Components should not contain fetch logic,
  websocket wiring, or debounce timers.
- `runtime/src/` — transport lives in its own module. The entry file wires it
  together and nothing else.

**Budgets.** A file past ~200 lines or a function past ~50 wants splitting. A
function taking more than four positional arguments wants an options object.
These are smells to investigate, not hard failures.

**Imports.** `@/` alias for anything under a package's `src`. No deep relative
chains (`../../../`).

**UI.** Reuse shadcn/ui components in `app/src/components/ui/` before writing
custom ones. Tailwind v4 utilities; no bespoke CSS files unless the component
genuinely cannot be expressed in utilities.

**State.** TanStack Query owns all server state — no manual fetch-and-setState.
Local UI state stays in components.

## The Injected Runtime — Special Rules

`runtime/` is the highest-risk code in the repo because it runs inside someone
else's document.

- **Zero dependencies.** No React, no Yjs, no npm packages. Vanilla DOM.
- **Size budgets, per bundle: 30KB for `runtime.js`, 22KB for `author.js`,
  12KB for `download.js`.** Set in `runtime/check-bundle-size.mjs`, which is
  the only place the numbers live. A PR that exceeds one needs justification,
  and a bundle with no budget fails the check by design. `author.js` went from
  18KB to 22KB when text became editable in place — budgets are re-set
  deliberately, never quietly.
- **The reader's bundle is the one that matters.** `runtime.js` goes to
  everyone who opens a link; `author.js` loads only once the room reports
  `canWrite`. Anything only a writer can reach — gestures, the place tool,
  the body editor, the edit surface, selection reporting — belongs in the
  authoring chunk. Anything needed to *read* a marked-up, edited document —
  painting, the sticky view, `edits/apply` — stays in the core, because a
  view-only reader still has to see an edit somebody else made.
- **Never leak.** One namespaced global. All UI in a shadow root so our styles
  cannot touch the artifact and theirs cannot touch ours.
- **Fail open.** If the websocket dies or the runtime throws, the artifact must
  still render and read correctly. A broken editor is acceptable; a broken
  document is not.

## Security

- **Artifacts are served from a separate sandbox origin, never the app domain.**
  We host untrusted third-party HTML with scripts enabled; if it shares an origin
  with authenticated app pages, that is stored XSS against every user. This is
  not negotiable for convenience.
- Share tokens are unguessable, scoped to one artifact, and independently
  revocable. View tokens and edit tokens are distinct.
- Secrets live in Worker environment bindings. Only `.env.example` is committed.
  Never read a secret in client code.
- Enforce upload size and rate limits at the Worker before touching storage.
- **There is no CORS anywhere, and there should not be.** Every cross-origin
  interaction is either a same-origin fetch or an origin-checked `postMessage`.
  A browser page on any other origin cannot call the API at all — that is the
  intent, not an oversight. Adding an `Access-Control-Allow-Origin` header to
  reach the API from somewhere else is the wrong fix.

## Testing

- Vitest colocated with source. Test doubles live in `fakes.ts` files, excluded
  from the build.
- Required coverage: Zod schema boundaries, Durable Object state transitions
  (especially concurrent edits and reconnects), and token authorization paths.
- Skip tests for pure presentational components.
- The worker's tests run through `worker/run-tests.mjs`, not vitest directly. On
  Windows the workers pool cannot unlink the rooms' SQLite files when it deletes
  its own temp directory, so a run where every test passed exits 1 about half the
  time. The wrapper recognises that one failure — an `EBUSY`/`EPERM` unlink with
  no failing test reported — and nothing else. Do not widen it, and do not
  silence it with `dangerouslyIgnoreUnhandledErrors`; that hides the report
  without changing the exit code.

## Conventions

- Generate `.md` or README files only when explicitly asked.
- Prefer editing existing files over creating new ones.
- Use the Context7 MCP for library and API documentation, setup, and
  configuration steps without waiting to be asked.

## Development Commands

pnpm only — never npm or yarn.

```bash
pnpm install          # install workspace dependencies
pnpm dev              # app + worker with local Durable Objects
pnpm test             # vitest
pnpm typecheck        # tsc across all packages
pnpm lint             # eslint + prettier check
pnpm build            # production build, all packages
```
