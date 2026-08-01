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

- `app/` — the Coedit web app (upload, dashboard, share settings). React + Vite.
- `worker/` — Cloudflare Worker: API routes, artifact serving, Durable Objects
  holding per-document state and websocket fanout. **All backend logic lives here.**
- `runtime/` — the injected editor script. Built standalone, zero dependencies.
- `website/` — marketing site. Next.js on Cloudflare. No app logic.

## Artifact Conventions

- Input format is a **single HTML file** with inline CSS and JS. Reject JSX,
  multi-file uploads, and anything needing a build step at the boundary — do not
  add a bundler to accommodate them.
- The editable unit is a top-level `<section>`. Sections drive navigation,
  presence, soft locks, comment anchors, and version diffs. Anything operating on
  a smaller granularity needs a good reason.

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

**Comments carry rationale, not narration.** Do not restate what the code says —
if a comment is needed to explain *what* a block does, rename things or split the
function instead. Do write a comment when the reason is invisible from the code:
a browser quirk, a spec requirement, a deliberately non-obvious approach, or a
constraint that will look like a mistake to the next reader. No commented-out
code, no changelog comments, no section-banner comments. Delete dead code.

**Extract on the second use, not the first.** Don't build abstractions for
hypothetical needs, but the moment logic appears twice, pull it out. Concrete
homes for it:

- `worker/lib/` — token parsing and authorization, Zod schemas, storage keys,
  response helpers. Route handlers should read as validate → authorize → act.
- `app/src/hooks/` — anything stateful and reusable: `useArtifact`,
  `usePresence`, `useShareLink`. Components should not contain fetch logic,
  websocket wiring, or debounce timers.
- `runtime/src/` — DOM walking, section resolution, and transport each stay in
  their own module. The entry file wires them together and nothing else.

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
- **Size budget: 20KB minified.** A PR that exceeds it needs justification.
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

## Testing

- Vitest colocated with source. Test doubles live in `fakes.ts` files, excluded
  from the build.
- Required coverage: Zod schema boundaries, Durable Object state transitions
  (especially concurrent edits and reconnects), and token authorization paths.
- Skip tests for pure presentational components.

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
