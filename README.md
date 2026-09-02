# coeditHTML

Turn a single-file HTML artifact — the kind Claude, ChatGPT, or v0 produces —
into a link that other people can open, comment on, and edit. No account, no
install, no build step for the people you send it to.

**Live at [coedithtml.com](https://coedithtml.com).** The app is
[app.coedithtml.com](https://app.coedithtml.com).

## The constraint everything else follows from

**We never parse or rewrite the uploaded HTML.** The file is stored
byte-for-byte and served back byte-for-byte, with one script tag appended after
`</html>` — a pure append, never a search-and-replace. That script is the editor
runtime.

Artifacts are single files with tightly coupled inline CSS. A selector like
`body > div:nth-child(3)` breaks the moment you wrap something. So everything a
human contributes — comments, edits, statuses, presence — lives in a separate
overlay document keyed to anchors, and the artifact stays the artifact.

If a feature needs to understand the user's markup to work, it is the wrong
feature. That rule is why the codebase looks the way it does.

## Architecture

Two origins, always:

- **App origin** (`app.coedithtml.com`) — the chrome: title bar, share controls,
  comment rail, the owner's file list. The only origin that may hold a cookie.
- **Sandbox origin** (`coedit.coedithtml-worker.workers.dev`) — serves artifacts
  inside a cross-origin `<iframe>`. Never receives a credential.

Untrusted third-party HTML runs with scripts enabled. Serving it from the
authenticated app's origin would be stored XSS against every user, so the split
is structural rather than a hardening pass. There is no CORS anywhere: every
cross-origin interaction is a same-origin fetch or an origin-checked
`postMessage`.

### Packages

| Package     | What it is                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `app/`      | The web app — upload, viewer, comment rail, share settings. React + Vite.                               |
| `worker/`   | Cloudflare Worker: API routes, artifact serving, Durable Objects for per-document state and websockets. |
| `runtime/`  | The editor script injected into the artifact. Built standalone, zero dependencies, vanilla DOM.         |
| `protocol/` | The shared vocabulary both sides of the wire agree on: anchors, overlay entries, room messages, export. |
| `website/`  | The marketing site at the apex. Next.js static export.                                                  |

All backend logic lives in `worker/`. `protocol/` is dependency-free and
DOM-free — `runtime/` imports it directly, so anything added there lands inside
the injected script.

### Storage

- **R2** (`ARTIFACT_STORE`) — artifact bytes, deduplicated by content hash.
- **KV** (`ARTIFACT_METADATA`) — per-artifact metadata and share tokens.
- **Durable Objects** — `DocRoom` holds one document's overlay state and fans
  out websocket messages; `RateLimiter` and `UsageLedger` hold the ceilings.

## Running it locally

Requires **Node 22+** and **pnpm**. This is a pnpm workspace — `npm` or `yarn`
will produce a stray lockfile and break the build.

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the runtime build in watch mode, the app's Vite server, and
the Worker with local Durable Objects. The Worker routes by hostname, so open:

- **App** — http://app.localhost:8787
- **Tutorial** — http://app.localhost:8787/tutorial
- **Sandbox** — `sandbox.localhost:8787` (artifacts; you will not visit it
  directly)

For the MCP endpoints, copy `worker/.env.example` to `worker/.dev.vars` and set
`MCP_SIGNING_SECRET`. Everything else runs without configuration.

### Commands

| Command          | What it does                            |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | App + Worker with local Durable Objects |
| `pnpm test`      | Vitest across every package             |
| `pnpm typecheck` | `tsc` across every package              |
| `pnpm lint`      | ESLint + Prettier check                 |
| `pnpm build`     | Production build, all packages          |

## Deploying your own

You will need a Cloudflare account with Workers, R2, KV, and Durable Objects.

1. Create an R2 bucket and a KV namespace, then put their names and IDs in
   `worker/wrangler.jsonc`. The IDs committed there are ours and will not
   resolve for you.
2. Point `APP_HOST` and `SANDBOX_HOST` at two hostnames you control. **They must
   be different origins.** Pointing both at one host is the one change that
   turns this into a stored-XSS vector.
3. Set the Worker secrets: `wrangler secret put MCP_SIGNING_SECRET --env production`.
4. `pnpm deploy` builds every package and deploys the Worker. The marketing site
   deploys separately with `pnpm --filter @coedithtml/website run deploy`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). It has the setup, the checks CI
runs, and the handful of load-bearing rules — never parse the artifact, two
origins and no CORS, the injected runtime's budget and fail-open behaviour —
that most of a review consists of checking against.

Security issues go to [SECURITY.md](SECURITY.md), not the public tracker.

## License

MIT — see [LICENSE](LICENSE).
