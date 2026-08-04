# coeditHTML — Roadmap

Two phases. Check the phase box only when every task under it is done and the
exit criteria hold. Read `PRODUCT.md` first — it explains why several of these
tasks look stranger than they need to.

---

## Phase 1 — Serve

**Goal:** upload a single HTML file, get a link, open it and use the artifact
exactly as its author built it. No comments, no editing, no realtime.

**Exit criteria:** you can hand the link to someone who has never heard of the
product, on their phone, and the artifact works for them the way it works for
you — its own layout, its own navigation — without asking a question.

- [ ] **Phase 1 complete**

### Foundation

- [x] pnpm workspace with `app/`, `worker/`, `runtime/`, `website/`
- [x] Wrangler config with R2 and KV bindings, local dev running end to end
- [x] Two origins configured and verified separate in production
- [x] CI running typecheck, lint, and tests on every push

### Storage and serving

- [x] Upload endpoint: single `.html` only, size cap, content sniffing, reject
      anything that is not a complete HTML document
- [x] Artifact stored in R2 byte-for-byte, metadata in KV with a read path
- [x] Serve handler appends exactly one script tag **after `</html>`** — a pure
      append, never a search-and-replace — and changes nothing else, verified by
      a byte-diff test
- [x] Detect artifacts shipping their own restrictive CSP meta tag and show an
      honest error rather than a silently dead viewer
- [x] CSP on artifact responses: external resources allowed, credentialed
      same-origin requests blocked
- [x] View and edit tokens, unguessable, independently revocable
- [x] Optional password gate on a link
- [x] Rate limits and abuse ceiling on upload

### Viewer

- [x] Chrome on app origin, artifact in cross-origin iframe with correct sandbox
      attributes and no top-navigation or popups
- [x] Serve handler appends exactly one script tag **after `</html>`** and
      changes nothing else, verified by a byte-diff test
- [x] `postMessage` bridge: versioned schema, origin checked on send (explicit
      target origin, never `"*"`) and on receipt (`event.origin` matched
      exactly, shape validated before use)
- [x] Injected runtime reports that the frame came up and what the document
      calls itself — and nothing else — 21
- [x] Thin share bar: the artifact's title and a way to copy the link — 21
- [x] Artifact fills the frame and keeps its own layout, navigation, and key
      handling — 21
- [x] Runtime fails open — kill the bridge in a test and confirm the artifact
      still runs, with its markup byte-identical — 21
- [x] Runtime build stays under 20KB minified, enforced in CI (currently
      0.5KB) — 21

### Ship

- [x] Landing page explaining the product in one screen — 18
- [x] Upload → link flow with no account required — 18; the share link opens
      the app's viewer at `/a/<token>`, not the raw sandbox URL — 20
- [x] App build served on the app origin — the open question flagged on 14 — 20
- [ ] Ten real artifacts from ten real people uploaded and read

### Delivery stack

Phase 1 as a sequence of individually-reviewable branches/PRs, none expected
to exceed ~1000 lines (flagged inline if one does once built). Each maps back
to the task group above it belongs to.

- [x] **Foundation**
  - [x] `01-workspace-scaffold` — pnpm workspace; `app/`, `worker/`, `runtime/`,
        `website/` scaffolded, each buildable, nothing functional yet
  - [x] `02-wrangler-bindings` — `wrangler.jsonc` with R2 + KV bindings, local
        `wrangler dev` end to end
  - [x] `03-two-origins` — app origin vs. sandbox origin as separate
        Wrangler targets, enforced in config and code, live and verified
        separate in production
  - [x] `04-ci-pipeline` — GitHub Actions: install, typecheck, lint, test on
        every push
  - [x] `05-domain-layout` — app on app.coedithtml.com, apex freed for the
        marketing site, www 301s to the apex
- [x] **Storage and serving**
  - [x] `06-upload-endpoint` — Zod-validated upload route, single `.html`
        only, size cap, content sniffing, stored to R2 byte-for-byte
  - [x] `07-r2-kv-storage` — artifact metadata to KV and a read path; the R2
        write and storage-key helpers landed with 06
  - [x] `08-serve-append-handler` — append-after-`</html>` serve handler,
        byte-diff test
  - [x] `09-csp-tokens` — CSP meta-tag detection/error, CSP response headers
        (`frame-ancestors` locked to the app origin), view/edit tokens minted
        on upload and required by both read routes. Split into three branches
        rather than one (password gate and rate limits are separable
        concerns, and bundled would have pushed well past the ~1000-line
        guideline) — numbering kept as 09/09b/09c so 10-18 didn't need to
        shift:
    - [x] `09-csp-tokens` — this entry
    - [x] `09b-password-gate` — optional password gate backend (hash + verify
          + password-attempt rate limiting); no prompt UI yet, since the
          viewer page it belongs on doesn't exist until stack C. Password is
          passed as a `?password=` query param on the sandbox origin, since a
          plain `<iframe src>` navigation can't carry a custom header and the
          sandbox origin is architecturally barred from ever holding a
          cookie — flagged for review since query strings land in browser
          history and any access logs
    - [x] `09c-upload-rate-limits` — general upload abuse ceiling, reusing
          09b's rate-limit primitive
    - [x] `09d-serve-runtime-bundle` — replaces the `/__coedit/runtime.js`
          404 placeholder with the real esbuild output, served via Cloudflare
          Workers Static Assets (`assets.directory` pointed straight at
          `runtime/dist`, `run_worker_first: true` so origin classification
          and CSP still apply to it). Injects `window.__coedit_config__ =
          {appOrigin}` ahead of the bundle so the not-yet-built postMessage
          bridge (stack C) has a safe `postMessage` target origin, since the
          runtime can't otherwise read the parent's origin from inside a
          cross-origin iframe. Added as its own branch once it became clear
          branch 14 (viewer, rooted on the segmentation stack off `main`)
          has no ancestry containing this worker code and can't touch it
          directly — this stays on stack A instead
- [x] **Integration and audit** — `20-phase-1-integration`
  - [x] Phase 1 had been built as two stacks that both branched from `main`
        and never met (07-09d/18 for storage and serving, 10-19 for
        segmentation and the viewer), with `15b-design-system` committed once
        on each side. Neither was Phase 1 alone; this merges them and
        resolves the four conflicting files by union
  - [x] The app build was never served: the only assets binding pointed at
        `runtime/dist` and every non-API path on the app origin answered with
        the string "Coedit app origin", so the filmstrip built across 14-19
        had no consumer at all. `assemble-assets.mjs` stages the app build
        and the runtime bundle into one directory (Wrangler allows a single
        assets tree per Worker) and origin classification still decides what
        each host may read
  - [x] Fixes found in the end-of-phase audit:
        segmentation measured rendered heights, so slide counts still
        differed per device and the corpus could not catch it (its layout
        fixtures carried `data-test-height` attributes the test read back as
        stubbed geometry — removed, and those five fixtures rewritten at a
        realistic length); the password gate charged a correct password
        against its own attempt budget, locking readers out after roughly
        five views; uploads using `<script type="module">` with CDN imports
        were rejected as needing a build step; `resolveAppOrigin` fell back
        to `document.referrer`, making any page that could frame an artifact
        a trusted command origin; Stage mode never reported back, was not
        re-applied after resegmentation, and fought the scroll-spy over
        zero-height hidden elements; and the resegmentation watcher ran the
        strategies inside its own timer, outside `start()`'s error handling —
        the same fail-open gap 17 and 19 each fixed one layer up
  - [x] Password handling reworked: PBKDF2 rather than one SHA-256 round, and
        the password is POSTed to an unlock route and exchanged for a
        short-lived artifact-scoped grant instead of riding in a query string
        the artifact's own scripts could read back
  - [x] Upload caps the body while reading it rather than after; token
        revocation reachable at `DELETE /api/artifacts/:token`, which the
        roadmap had already claimed while the helper had no caller
  - [x] `@coedithtml/protocol` — the bridge schema had been maintained by
        hand in two mirrored copies, one per package
- [x] **Host, don't parse** — `21-host-dont-parse`
  - [x] Deletes the segmentation engine, the viewer's slide machinery, and the
        filmstrip: `runtime/src/segmentation/`, `runtime/src/viewer/`, the
        20-artifact fixture corpus, `Filmstrip`, `ArtifactStatusBar`,
        `StickyWarning`, `ReadingProfilePicker`, the reading-profile field and
        its `PATCH` route — about 3,700 lines
  - [x] The artifact is an application, not a document to take apart. It has
        its own layout, navigation, and key handling, and the heuristics were
        wrong in a way that got worse as artifacts got better: the project's
        own pitch deck — seven `<section>`s inside a stage wrapper, with its
        own nav and arrow keys — was read as three "pages", so the chrome and
        the artifact disagreed on screen about what the reader was looking at
  - [x] What survives is the part that was never about parsing: two origins,
        the byte-for-byte append, the origin-checked bridge, fail-open, tokens,
        the password gate, rate limits. The runtime now reports `ready` with
        the document title and nothing else; the bundle went 8.0KB to 0.5KB
  - [x] Phase 2 anchors comments to what the reader selects rather than to a
        structure we inferred — a smaller problem, and one that fails visibly
        instead of silently
- [ ] **Ship**
  - [x] `18-landing-upload-flow` — independent stack (Stack D), rooted on this
        stack's own tip (`09d`) rather than the segmentation/viewer stack,
        since the real dependency here is the upload/token/serving contract
        those branches built, not the viewer UI. Cherry-picked `15b`'s
        design-system commit from the other stack onto this one (same
        content, duplicated on purpose — reconciled when the user merges
        both stacks) so the landing page uses the same tokens rather than
        inventing new ones. `worker/src/routes/upload.ts` now returns
        fully-qualified `viewUrl`/`editUrl` (not just raw tokens) computed
        server-side via a new shared `originFor()` helper in
        `worker/lib/origins.ts`, also used by `sandbox.ts` — the frontend
        has no other way to know the sandbox host without duplicating worker
        config. `app/`: `useUploadArtifact` (TanStack Query mutation) +
        `UploadDropzone` (drag/drop, client-side `.html`/size validation) +
        `ShareLinkResult` (copy-to-clipboard) + `LandingPage` composing them
        with one-screen explanatory copy. Added a Vite dev proxy for `/api`
        so the app dev server can reach the worker locally; hit and fixed a
        real gotcha along the way — Node's DNS resolver doesn't special-case
        `*.localhost` the way browsers do, so the proxy target has to be
        `127.0.0.1` with the `Host` header set by hand, not
        `app.localhost:8787` directly. Browser-verified for real, not
        against a demo harness: ran the actual worker (`wrangler dev`) and
        app dev servers together, uploaded a real file through the UI,
        confirmed the returned link resolves and serves the artifact
        byte-for-byte with the runtime injected (`window.__coedit__`
        present). Flagged for the end-of-phase audit: the link this flow
        hands back opens the **raw sandboxed artifact directly** — no
        Filmstrip/Flow/Stage chrome, because that lives in `ArtifactViewer`
        on the other, currently-unmerged stack, and wiring an app-origin
        "reader" route through it needs the two stacks integrated first
        (the user's own merge step). Separately, and more fundamentally,
        *how `app/`'s own build output gets served in production at all* is
        still the same open question flagged back on branch 14 — until
        that's resolved, there's no production URL for this landing page to
        live at regardless of the reader-route question
  - [ ] Ten real artifacts uploaded and read — manual validation, not a PR

---

## Phase 2 — Mark

**Goal:** comments and redlines on a read-only artifact. The HTML still never
changes, so there is no conflict resolution in this phase. Keep it that way.

**Exit criteria:** two people on different devices can review the same artifact
simultaneously, see each other, and disagree in writing.

- [ ] **Phase 2 complete**

### Overlay and anchoring

- [ ] Overlay document defined and versioned: artifact revision and entries of
      anchor + kind + body + author + status
- [ ] Author shape carries `source: "anonymous"` from day one so accounts are a
      new value later, not a migration
- [ ] Anchor format: structural path + normalized text hash + revision id
- [ ] Resolution order: path, then hash, then orphan
- [ ] Orphaned anchors displayed as unplaced — never guessed, never dropped
- [ ] Re-upload is a first-class screen: new revision, re-anchor, and a plain
      report — "14 comments, 11 re-placed, 3 need review"
- [ ] Orphans can be dragged back into place or dismissed by the owner
- [ ] Test suite covering drift: reordered sections, edited text, deleted nodes

### Realtime

- [ ] Doc room Durable Object, one per artifact
- [ ] Websocket transport with reconnect and backoff
- [ ] Presence: who is here
- [ ] Comment log persisted to DO SQLite
- [ ] Concurrent-connection and reconnect tests against the DO

### Comment UI

- [ ] Select text in the artifact, leave a comment — selection handled inside
      the runtime and reported up
- [ ] Region-level comments for artifacts with no selectable text
- [ ] Comment rail beside the artifact, threads anchored to their selection
- [ ] Unresolved count shown in the rail
- [ ] Reply, resolve, and reopen
- [ ] Commenter names are self-declared and stored locally — still no accounts

### Ship

- [ ] **Copy feedback for your AI tool** — overlay rendered to markdown with
      quoted text and the comments against each
- [ ] Email notification on new comment, opt-in per link
- [ ] Owner dashboard listing artifacts, links, and unresolved counts
- [ ] One full regeneration loop: share, collect, export, regenerate, re-upload,
      re-anchor — run with people who are not you

---

## Phase 3 — Edit

**Goal:** mutation. Text becomes editable in place. This is where two people can
finally disagree at the same moment, and where the complexity genuinely spikes.

**Exit criteria:** someone who is not the owner can fix a typo in a shared
artifact, and the owner can see exactly what changed and put it back.

- [ ] **Phase 3 complete**

### Safety net — build this before anything is editable

The undo story has to exist before the thing that needs undoing.

- [ ] Revisions are overlay snapshots, not artifact copies — cheap, since the
      artifact bytes never change within a revision
- [ ] Revision list with author, timestamp, and affected regions
- [ ] Restore-to-revision, working and tested, before `contenteditable` is
      switched on anywhere
- [ ] Rendered diff between two revisions — show the artifact, not the source
- [ ] Retention policy for revisions, and a storage cost estimate per artifact

### Edit surface

Edits are patches in the overlay, never a re-serialization of the document.
Serializing the live DOM back to HTML would silently normalize attribute
quoting, close unclosed tags, and lowercase element names — modifying the
artifact in exactly the way the whole design forbids.

- [ ] `contenteditable` on text nodes only — attributes, structure, and scripts
      stay untouched
- [ ] Editing writes into existing nodes and never inserts wrappers
- [ ] Paste is sanitized to plain text by default, since pasted rich HTML is the
      fastest way to destroy an artifact's styling
- [ ] Each commit appends a patch entry — anchor plus replacement text — to the
      overlay; the stored artifact bytes are never rewritten
- [ ] **Byte-diff test proving the stored artifact is identical before and after
      an editing session.** This is the single most important test in the repo
- [ ] Debounced autosave with an explicit saved / saving / failed state, never
      silent
- [ ] Local undo and redo stack inside the runtime

### Concurrency

- [ ] Region-level soft locks held in the Doc room
- [ ] Locks expire on a TTL — a closed laptop must not freeze a document
- [ ] Lock state visible on the artifact and in the comment rail
- [ ] Last-write-wins per region, with the collision surfaced to both people
      rather than resolved silently
- [ ] Edit tokens enforced server-side; a view token cannot mutate, and there is
      a test that tries

### Around the edges

- [ ] Comment anchors survive edits — re-resolve after every commit
- [ ] Style panel writing CSS custom properties only: accent, surface, type
      scale, spacing
- [ ] Runtime still under 20KB with the edit surface included, or split into a
      lazily loaded second chunk

### Ship

- [ ] One real artifact edited by three people in the same hour
- [ ] Owner reverts one of those edits without assistance

---

## Phase 4 — Converge

**Goal:** the expensive tail. Every item below is a real project, not a task.

**Gate — do not start until both are true:**

- [ ] Phase 3 has been live for a month
- [ ] A paying user has asked for a specific item below **by name**

**Then pick exactly two.** Five half-built features are indistinguishable from a
dead product.

- [ ] **Two selected, written down, dated**

### The menu

- [ ] **Accounts and identity.** Named sign-in, per-recipient edit links,
      individual revocation, and attribution that survives a forwarded link.
      The `author.source` field already anticipates this.
- [ ] **Automated round-trip.** Push the overlay to a model and pull back a new
      artifact revision without leaving the app. Deliberately unspecified — the
      tooling will have changed twice before this is worth designing.
- [ ] **Gated sharing.** Password, email-domain allowlist, and link expiry. The
      middle tier between fully public and org-only that nobody currently
      offers. Cheapest item here and the most defensible.
- [ ] **PPTX and PDF export.** Rendered from the artifact itself. Most requested in interviews, least used in practice — believe
      the second half of that sentence.
- [ ] **Per-node CRDT.** True simultaneous editing inside one region. Roughly a
      month. Only worth it if locks are demonstrably losing you users.
- [ ] **Custom domains and white label.** Serve artifacts from a client's own
      domain. Mostly DNS and certificate plumbing, plus a second sandbox origin
      strategy — think it through before promising it.
- [ ] **Offline editing.** Requires the CRDT above. Do not select independently.

- [ ] **Phase 4 complete** — meaning the two selected items shipped, not the list
      cleared
