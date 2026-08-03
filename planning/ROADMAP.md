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

- [x] pnpm workspace with `app/`, `worker/`, `runtime/`, `website/`
- [x] Wrangler config with R2 and KV bindings, local dev running end to end
- [x] Two origins configured and verified separate in production
- [x] CI running typecheck, lint, and tests on every push

### Storage and serving

- [x] Upload endpoint: single `.html` only, size cap, content sniffing, reject
      anything that is not a complete HTML document
- [~] Artifact stored in R2 byte-for-byte; metadata in KV still to come
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

- [x] Runtime waits for `load` plus a mutation-quiet period before segmenting
- [x] Strategy 1: explicit `[data-slide]` and top-level `<section>` detection
- [x] Strategy 2: `<hr>` and heading-level grouping
- [x] Strategy 3: accumulation over container children at a **fixed 900px
      virtual height**, never the real viewport
- [~] Strategy 4: single-slide fallback built and cascaded correctly;
      "surfaced honestly in the UI" is stack C's job (the viewer doesn't
      exist yet to surface anything in)
- [x] Slides emitted as index ranges — no DOM restructuring anywhere in the path
- [x] Slide labels derived from the first heading or first text in the range
- [x] Debounced `MutationObserver` triggers re-segmentation on structural
      change only, preserving reader position by content — 19
- [~] Reading profiles — Slides, Pages, App — auto-detection is built and
      tested (`segmentWithProfile`); the `Reading as ▾` control and storing
      the choice on the link are stack C/D work
- [x] Corpus of 20+ real artifacts checked into `fixtures/`, spanning documents,
      dashboards, games, and long-scroll pages
- [x] Snapshot test asserting expected slide counts across the whole corpus

### Viewer — filmstrip

- [x] Chrome on app origin, artifact in cross-origin iframe with correct sandbox
      attributes and no top-navigation or popups
- [x] `postMessage` bridge: versioned schema, origin checked both directions —
      now genuinely bidirectional: runtime → app (ready/resegmented/
      activeSlide) and app → runtime (scrollToSlide, setStageSlide), each
      checked on send (explicit target origin, never `"*"`) and on receipt
      (`event.origin` matched exactly, message shape validated before use)
- [x] Flow mode: scroll-spy and jump-navigation are built and tested on the
      runtime side (`watchScrollSpy`, `scrollToSlide`) — reporting which
      slide is in view and executing a scroll command are both live. The
      filmstrip UI that displays this and lets a reader click a thumbnail
      landed in 15c
- [x] Stage mode: hide/show logic (`createStageController`) and sticky/fixed
      detection (`hasStickyOrFixedPositioning`, included in every
      ready/resegmented message) are built and tested. The opt-in control and
      the warning UI landed in 15c
- [x] Thumbnails generated from live slide ranges, not screenshots — 15c
- [x] Keyboard navigation: arrows, home, end, and a visible focus ring — 16
- [x] Mobile layout: filmstrip collapses to a swipe strip — 16
- [x] Runtime fails open — kill the socket and the bridge in a test and confirm
      the artifact still reads correctly — 17
- [x] Runtime build stays under 20KB minified, enforced by a hook — 17

### Ship

- [ ] Landing page explaining the product in one screen
- [ ] Upload → link flow with no account required
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
- [ ] **Storage and serving**
  - [x] `06-upload-endpoint` — Zod-validated upload route, single `.html`
        only, size cap, content sniffing, stored to R2 byte-for-byte
  - [ ] `07-r2-kv-storage` — artifact metadata to KV and a read path; the R2
        write and storage-key helpers landed with 06
  - [ ] `08-serve-append-handler` — append-after-`</html>` serve handler,
        byte-diff test
  - [ ] `09-csp-tokens` — CSP meta-tag detection/error, CSP headers, view/edit
        tokens, password gate, rate limits
- [x] **Segmentation engine**
  - [x] `10-segmentation-load-wait` — wait for `load` + mutation-quiet period
  - [x] `11-segmentation-strategies-markers-semantic` — explicit markers, then
        `<hr>`/heading-grouping; also lands the shared `Slide` range type and
        label derivation both strategies (and the ones after them) build on
  - [x] `12-segmentation-layout-fallback` — fixed-900px virtual-height
        accumulation, single-slide fallback, index-range output + labels;
        also lands `segment()`, the cascade wiring all four strategies
        together in priority order
  - [x] `13-segmentation-fixtures-tests` — 20+ fixture corpus (5 per strategy:
        markers, semantic, layout, app), snapshot tests against hand-computed
        expected counts, debounced `MutationObserver` re-segmentation,
        `segmentWithProfile()` reading-profile auto-detection. UI control and
        server-side persistence of the chosen profile are stack C/D
- [x] **Viewer — filmstrip**
  - [x] `14-viewer-iframe-bridge` — `ArtifactFrame` (exact
        `sandbox="allow-scripts allow-same-origin"`, locked in by a test) +
        `useArtifactBridge` hook on the app side; `runtime/src/transport/`
        (origin resolution, versioned message builders, send) on the runtime
        side, wired into a real `runtime/src/index.ts` entry point (wait →
        segment → report ready → watch → report resegmented). Runtime bundle
        is 3.9KB minified, well inside the 20KB budget. Deployment-agnostic
        by design (no baked-in env vars) since how `app/`'s build output
        itself gets served in production is still an open question — flagged
        for the end-of-phase audit, not solved here
  - [x] `15-viewer-flow-stage` — split into wiring and UI, matching the
        09/09b/09c precedent (each half is substantial and independently
        reviewable; scroll-spy alone needs 3 new message types since a
        cross-origin iframe is opaque to the parent's own scroll/DOM
        observation, so there's more bridge protocol here than UI):
    - [x] `15-viewer-flow-stage` — this entry: bridge wiring only.
          `runtime/src/viewer/` (`positioning.ts` sticky/fixed detection,
          `scroll-spy.ts` scroll-spy + throttled reporting, `stage.ts`
          hide/show with a `WeakMap` preserving each element's real original
          inline `display` value, `navigate.ts` jump-to-slide) plus the
          matching `transport/` extensions (3 new message types, a
          `receive.ts` listener finally exercising the "checked in both
          directions" half left open by 14). App-side hook extended to track
          `activeSlideIndex`/`hasStickyOrFixed` and expose `sendCommand` +
          `frameRef`; `ArtifactFrame` now forwards a ref. Runtime bundle is
          6.0KB, still well inside the 20KB budget. Runtime-auditor
          subagent review: one low-severity fail-open gap found and fixed
          (`scroll-spy.ts`'s throttled recheck wasn't try/caught like the
          other watchers); everything else — Stage's hide/restore
          correctness across multi-cycle switches, no global-scope leaks,
          zero new dependencies, origin-recompute-per-message being the
          right call — came back clean
    - [x] `15b-design-system` — Tailwind v4 + shadcn/ui-compatible structure
          for `app/` (`components.json`, `src/lib/utils.ts`'s `cn()`,
          `class-variance-authority` for variant-based components), carrying
          forward the design language from the original planning artifact
          (`planning/coedithtml-build-plan.html`, at the user's explicit
          request) rather than inventing a new one: Archivo + IBM Plex Mono,
          a `paper`/`ink`/`wet`/`tape`/`dry`/`line` color palette mapped onto
          shadcn's semantic tokens via Tailwind v4's `@theme inline`, hard
          2px ink borders, sharp 3px corners, a `tape`-yellow focus ring
          matching the reference file's own `:focus-visible` convention.
          Verified by building and grepping the compiled CSS for the
          registered tokens, not just a clean `tsc`. No visual smoke test
          yet — nothing user-facing exists until 15c
    - [x] `15c-viewer-flow-stage-ui` — the actual filmstrip, built on 15b's
          tokens: thumbnails (text/label-based, not screenshots — no way to
          capture cross-origin iframe content without much more machinery),
          Flow mode's scroll-spy-highlighted strip, the Stage-mode opt-in
          toggle and its sticky/fixed warning — the layout and interaction
          patterns are a rough match for "Mock D" in the reference file.
          `ArtifactStatusBar`, `Filmstrip`, `StickyWarning`, `ArtifactViewer`
          composing them, 16 new tests. Browser-verified against a demo
          harness dispatching a synthetic `ready` message: design system
          renders correctly, the Stage toggle (local state, no round trip)
          updates immediately. Clicking a thumbnail correctly does *not* move
          the active-slide highlight in the demo — that highlight is driven
          only by an `activeSlide` message the real runtime sends back after
          its own scroll-spy detects the new position, and the demo's
          `src="about:blank"` has no runtime to send it. Confirmed this is
          the intended design (the highlighted thumbnail should only ever
          reflect what the document actually shows, never an optimistic
          guess) rather than a bug, but it means the click→highlight round
          trip itself is unverified in a browser until a real artifact is
          served end-to-end — worth a manual check against a live sandboxed
          artifact before Phase 1 ships
  - [x] `16-viewer-keyboard-mobile` — roving-tabindex keyboard nav on the
        `Filmstrip` tablist (ArrowLeft/Right move and select, clamped rather
        than wrapping at the ends; Home/End jump to first/last), a
        `focus-visible` ring matching the `Button` component's tape-yellow
        outline, and CSS scroll-snap (`snap-x snap-mandatory` /
        `snap-start`) so the strip behaves like a native swipe carousel on
        touch — no separate mobile layout needed since the strip was already
        a single-row `overflow-x-auto` track at every width, matching the
        reference file's own filmstrip mock. Browser-verified: clicking a
        thumbnail focuses it; ArrowRight/Left/Home/End move DOM focus
        01→02→03→04→(End)→04, and ArrowLeft clamps at 01 rather than
        wrapping — confirmed via `document.activeElement`, since (as with
        clicks in 15c) the *visual* active-slide highlight only updates from
        a runtime-reported message the demo harness has no runtime to send
  - [x] `17-viewer-fail-open-budget` — fixed a real fail-open gap: `start()`'s
        initial ready-send wasn't try/caught, so a dead bridge (postMessage
        throwing) skipped wiring up resegmentation watching, scroll-spy, and
        command listening entirely, not just that one message. Now each
        phase is independently try/caught, matching the pattern already used
        for the others. New `runtime/src/index.test.ts` exercises the whole
        `start()` pipeline end-to-end with a `window.parent.postMessage` that
        always throws: confirms the artifact's own markup is byte-for-byte
        untouched, confirms Stage-mode commands still apply correctly
        despite the failed ready-send, and confirms `waitUntilReady`
        resolves via its `maxWaitMs` cap rather than hanging on a
        continuously-mutating page. Bundle-size budget moved out of the
        session-only Claude Code hook and into CI as its own authoritative
        gate: `runtime/check-bundle-size.mjs` (no build side effect — CI's
        own `pnpm build` step already produced `runtime/dist/`) wired in as
        `pnpm --filter runtime run check-size`, verified to both pass at the
        current 6.0KB and fail loudly against a planted oversized file.
        The runtime-auditor subagent review that caught a real bug on 15
        (the scroll-spy fail-open gap) was kicked off for this branch too;
        this went out on manual review only since it took over an hour to
        return (every prior audit this session took 2-3 minutes) — it did
        eventually finish and confirmed the try/catch fix itself is correct,
        with no dependency/global-scope issues in the new files, but it also
        found one more gap in the same spirit one line earlier
        (`segmentWithProfile()` itself wasn't guarded) — fixed in 19
  - [x] `19-viewer-position-preservation` — closes a gap flagged back on 13
        and never actually picked up by 14-17: resegmentation was clamping
        `activeSlideIndex` numerically
        (`Math.min(previous, newSlides.length - 1)`) instead of "preserving
        reader position... by content, not raw index" as the roadmap always
        said. New `runtime/src/viewer/position.ts`: the runtime now holds a
        live reference to the active slide's anchor DOM element (updated on
        every scroll-spy change), and on resegmentation re-locates that same
        element in the post-mutation DOM to find which *new* slide contains
        it — falling back to the old numeric clamp only if the anchor itself
        was removed. `resegmented` messages now carry the resolved
        `activeSlideIndex` directly (both `runtime/transport/messages.ts`
        and the app's `bridge-messages.ts` schemas extended, mirroring each
        other exactly as they already did for every other message field);
        `useArtifactBridge` deleted its own clamping logic in favor of
        trusting the runtime's answer. Runtime bundle now 6.4KB, still well
        inside the 20KB budget. Follow-up once the runtime-auditor review of
        17 finally returned (see 17's note — it took over an hour): it found
        one more un-try/caught throw path in the exact same spirit as 17's
        own fix, one line earlier — the initial `segmentWithProfile()` call
        itself wasn't guarded, so a throw there would skip wiring up
        resegmentation watching, scroll-spy, and command listening entirely,
        same as the bug 17 fixed for the ready-send. Low severity (no
        segmentation strategy mutates the DOM, so the artifact itself was
        never at risk) but same class of bug, so fixed the same way: a
        `segmentSafely()` wrapper falling back to an empty single-slide
        result, with a new regression test that mocks the segmentation
        module to throw once, then confirms resegmentation still recovers
        and reports real slides once the DOM settles again. Runtime bundle
        now 6.5KB
- [ ] **Ship**
  - [ ] `18-landing-upload-flow` — landing page, upload→link flow, no account
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
