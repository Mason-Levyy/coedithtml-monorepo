# coeditHTML — Roadmap

Two phases. Check the phase box only when every task under it is done and the
exit criteria hold. Read `PRODUCT.md` first — it explains why several of these
tasks look stranger than they need to.

---

## Phase 1 — Serve

**Goal:** upload a single HTML file, get a link, read it as a filmstrip deck.
No comments, no editing, no realtime.

**Exit criteria:** you can hand the link to someone who has never heard of the
product, on their phone, and they can read the whole artifact without asking a
question.

- [ ] **Phase 1 complete**

### Foundation

- [ ] pnpm workspace with `app/`, `worker/`, `runtime/`, `website/`
- [ ] Wrangler config with R2 and KV bindings, local dev running end to end
- [ ] Two origins configured and verified separate in production
- [ ] CI running typecheck, lint, and tests on every push

### Storage and serving

- [ ] Upload endpoint: single `.html` only, size cap, content sniffing, reject
      anything that is not a complete HTML document
- [ ] Artifact stored in R2 byte-for-byte, metadata in KV
- [ ] Serve handler appends exactly one script tag **after `</html>`** — a pure
      append, never a search-and-replace — and changes nothing else, verified by
      a byte-diff test
- [ ] Detect artifacts shipping their own restrictive CSP meta tag and show an
      honest error rather than a silently dead viewer
- [ ] CSP on artifact responses: external resources allowed, credentialed
      same-origin requests blocked
- [ ] View and edit tokens, unguessable, independently revocable
- [ ] Optional password gate on a link
- [ ] Rate limits and abuse ceiling on upload

### Segmentation engine

The core of the phase. Budget more time here than feels reasonable.

- [ ] Runtime waits for `load` plus a mutation-quiet period before segmenting
- [ ] Strategy 1: explicit `[data-slide]` and top-level `<section>` detection
- [ ] Strategy 2: `<hr>` and heading-level grouping
- [ ] Strategy 3: accumulation over container children at a **fixed 900px
      virtual height**, never the real viewport
- [ ] Strategy 4: single-slide fallback, surfaced honestly in the UI
- [ ] Slides emitted as index ranges — no DOM restructuring anywhere in the path
- [ ] Slide labels derived from the first heading or first text in the range
- [ ] Debounced `MutationObserver` triggers re-segmentation on structural change
      only, preserving reader position
- [ ] Reading profiles — Slides, Pages, App — auto-detected, surfaced as a
      `Reading as ▾` control, stored on the link rather than per viewer
- [ ] Corpus of 20+ real artifacts checked into `fixtures/`, spanning documents,
      dashboards, games, and long-scroll pages
- [ ] Snapshot test asserting expected slide counts across the whole corpus

### Viewer — filmstrip

- [ ] Chrome on app origin, artifact in cross-origin iframe with correct sandbox
      attributes and no top-navigation or popups
- [ ] `postMessage` bridge: versioned schema, origin checked both directions
- [ ] Flow mode: natural scroll, filmstrip as scroll-spy and jump navigation
- [ ] Stage mode: one slide visible, opt-in, warned when sticky or fixed
      positioning is detected
- [ ] Thumbnails generated from live slide ranges, not screenshots
- [ ] Keyboard navigation: arrows, home, end, and a visible focus ring
- [ ] Mobile layout: filmstrip collapses to a swipe strip
- [ ] Runtime fails open — kill the socket and the bridge in a test and confirm
      the artifact still reads correctly
- [ ] Runtime build stays under 20KB minified, enforced by a hook

### Ship

- [ ] Landing page explaining the product in one screen
- [ ] Upload → link flow with no account required
- [ ] Ten real artifacts from ten real people uploaded and read

### Delivery stack

Phase 1 as a sequence of individually-reviewable branches/PRs, none expected
to exceed ~1000 lines (flagged inline if one does once built). Each maps back
to the task group above it belongs to.

- [ ] **Foundation**
  - [ ] `01-workspace-scaffold` — pnpm workspace; `app/`, `worker/`, `runtime/`,
        `website/` scaffolded, each buildable, nothing functional yet
  - [ ] `02-wrangler-bindings` — `wrangler.toml` with R2 + KV bindings, local
        `wrangler dev` end to end
  - [ ] `03-two-origins` — app origin vs. sandbox origin as separate
        Wrangler/Pages targets, verified separate
  - [ ] `04-ci-pipeline` — GitHub Actions: install, typecheck, lint, test on
        every push
- [ ] **Storage and serving**
  - [ ] `05-upload-endpoint` — Zod-validated upload route, single `.html`
        only, size cap, content sniffing
  - [ ] `06-r2-kv-storage` — artifact bytes to R2, metadata to KV, storage-key
        helpers in `worker/lib/`
  - [ ] `07-serve-append-handler` — append-after-`</html>` serve handler,
        byte-diff test
  - [ ] `08-csp-tokens` — CSP meta-tag detection/error, CSP headers, view/edit
        tokens, password gate, rate limits
- [ ] **Segmentation engine**
  - [ ] `09-segmentation-load-wait` — wait for `load` + mutation-quiet period
  - [ ] `10-segmentation-strategies-markers-semantic` — explicit markers, then
        `<hr>`/heading-grouping
  - [ ] `11-segmentation-layout-fallback` — fixed-900px virtual-height
        accumulation, single-slide fallback, index-range output + labels
  - [ ] `12-segmentation-fixtures-tests` — 20+ fixture corpus, snapshot tests,
        `MutationObserver` re-segmentation, reading-profile control
- [ ] **Viewer — filmstrip**
  - [ ] `13-viewer-iframe-bridge` — sandboxed cross-origin iframe, versioned
        origin-checked `postMessage` bridge
  - [ ] `14-viewer-flow-stage` — Flow scroll-spy, Stage mode with sticky/fixed
        warning, thumbnails from live ranges
  - [ ] `15-viewer-keyboard-mobile` — keyboard nav + focus ring, mobile swipe
        strip
  - [ ] `16-viewer-fail-open-budget` — fail-open test, runtime-size-budget
        hook wired into CI
- [ ] **Ship**
  - [ ] `17-landing-upload-flow` — landing page, upload→link flow, no account
  - [ ] Ten real artifacts uploaded and read — manual validation, not a PR

---

## Phase 2 — Mark

**Goal:** comments and redlines on a read-only artifact. The HTML still never
changes, so there is no conflict resolution in this phase. Keep it that way.

**Exit criteria:** two people on different devices can review the same artifact
simultaneously, see each other, and disagree in writing.

- [ ] **Phase 2 complete**

### Overlay and anchoring

- [ ] Overlay document defined and versioned: artifact revision, profile, and
      entries of anchor + kind + body + author + status
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
- [ ] Presence: who is here, which slide they are on
- [ ] Comment log persisted to DO SQLite
- [ ] Concurrent-connection and reconnect tests against the DO

### Comment UI

- [ ] Select text in the artifact, leave a comment — selection handled inside
      the runtime and reported up
- [ ] Slide-level comments for artifacts with no selectable text
- [ ] Comment rail beside the stage, threads anchored to their slide
- [ ] Unresolved count badged on the filmstrip thumbnail
- [ ] Reply, resolve, and reopen
- [ ] Commenter names are self-declared and stored locally — still no accounts

### Ship

- [ ] **Copy feedback for your AI tool** — overlay rendered to markdown with
      slide labels, quoted text, and comments against each
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
- [ ] Revision list with author, timestamp, and affected slides
- [ ] Restore-to-revision, working and tested, before `contenteditable` is
      switched on anywhere
- [ ] Rendered diff between two revisions — show the deck, not the source
- [ ] Retention policy for revisions, and a storage cost estimate per artifact

### Edit surface

Edits are patches in the overlay, never a re-serialization of the document.
Serializing the live DOM back to HTML would silently normalize attribute
quoting, close unclosed tags, and lowercase element names — modifying the
artifact in exactly the way the whole design forbids.

- [ ] `contenteditable` on text nodes only — attributes, structure, and scripts
      stay untouched
- [ ] Editing writes into existing nodes and never inserts wrappers, same
      constraint as segmentation
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

- [ ] Section-level soft locks held in the Doc room
- [ ] Locks expire on a TTL — a closed laptop must not freeze a document
- [ ] Lock state visible on the stage and on the filmstrip thumbnail
- [ ] Last-write-wins per section, with the collision surfaced to both people
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
- [ ] **PPTX and PDF export.** From the section tree, since slides are already
      the unit. Most requested in interviews, least used in practice — believe
      the second half of that sentence.
- [ ] **Per-node CRDT.** True simultaneous editing inside one section. Roughly a
      month. Only worth it if locks are demonstrably losing you users.
- [ ] **Custom domains and white label.** Serve artifacts from a client's own
      domain. Mostly DNS and certificate plumbing, plus a second sandbox origin
      strategy — think it through before promising it.
- [ ] **Offline editing.** Requires the CRDT above. Do not select independently.

- [ ] **Phase 4 complete** — meaning the two selected items shipped, not the list
      cleared
