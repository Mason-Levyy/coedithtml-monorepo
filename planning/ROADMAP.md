# coeditHTML — Roadmap

Versions, ending at v1. Check a version's box only when every task under it is
done and the exit criteria hold. Read `PRODUCT.md` first — it explains why
several of these tasks look stranger than they need to.

**v1 means: you would send the link to a large number of strangers.** Not
accounts, not billing. It means the product is clean, honest about what it does,
and defended against the obvious ways an anonymous upload endpoint gets abused —
one person uploading a hundred files, a bill nobody capped, an abuse report with
no answer.

| Version | Name | State |
| --- | --- | --- |
| v0.1 | Serve | done, deployed |
| v0.2 | Mark | done, one ship item carried to v1.0 |
| v0.3 | Edit | built; autosave, undo/redo, and the rail's revert controls open |
| v0.4 | Site | built and live at the apex, on a stale build |
| v0.5 | Share on purpose | landed 2026-08-16, one task and a deploy open |
| v0.6 | Hold the line | not started |
| v1.0 | Ship | not started |

The first three were originally written as numbered phases and are renamed here,
not rewritten — the history under them is the record of what actually happened
and is left as it was, apart from corrections marked **Audit 2026-08-13** and
**Audit 2026-08-16**.

`Deploy`, at the end, is not a version. It is the thing every version has to
survive.

## The route to v0.5

Written 2026-08-16, after an audit that found `main` red, one version checked off
without being built, and another built without being merged. Each version's own
delivery stack has the detail; this is the order, and who holds each step.

1. ~~**`42-green-the-trunk`**~~ — done 2026-08-16, and smaller than written. Two
   of the three failures fixed themselves when v0.5's stack landed an hour later;
   what was left was Prettier wanting to reformat `worker/tutorial/deck.html`,
   which is an artifact and is now ignored for the reason artifacts always are
2. ~~**v0.5's seven**~~ — landed 2026-08-16 as PRs #41–#44, out of the order
   written here and none the worse for it. `46-upload-rejection-copy` is the one
   task in that version nobody has written yet
3. **v0.3's three branches** — `43-rail-buckets`, then `44-edit-autosave`, then
   `45-undo-redo`. `43` is the version's exit criterion and goes first. This is
   now the only unbuilt work between here and v0.6
4. **Deploy, twice — yours.** The website, which is stale at the apex, and the
   app, which is now four merged PRs ahead of what is live
5. **Two checks nobody can do from a terminal — yours.** Two real devices in one
   room, which is all v0.2 is still waiting on, and one mail to
   `team@coedithtml.com` to prove the abuse contact is reachable

That closes v0.2, v0.3, v0.4, and v0.5. v0.6 is untouched and is the whole
remaining risk: every ceiling that makes a wide send defensible rather than brave
is still unwritten.

---

## v0.1 — Serve

**Goal:** upload a single HTML file, get a link, open it and use the artifact
exactly as its author built it. No comments, no editing, no realtime.

**Exit criteria:** you can hand the link to someone who has never heard of the
product, on their phone, and the artifact works for them the way it works for
you — its own layout, its own navigation — without asking a question.

- [x] **v0.1 complete** — 2026-08-04, code-complete and verified against
      `wrangler dev`. The exit criterion above is still untested on a real
      device, because what is deployed today is a placeholder — see **Deploy**
      at the end of this file.

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
- [x] The frame adapts to the artifact: a document grows the frame and lets the
      page scroll, an artifact that hides its own overflow keeps the viewport it
      was given — 21b
- [x] Runtime build stays under the minified budget, enforced in CI — 21b.
      **Audit 2026-08-13:** the single-number budget this line describes no
      longer exists. It ran 20KB → 32KB → 40KB and was then replaced by
      per-bundle budgets when `37-split-runtime` split the runtime in three:
      `runtime.js` 30KB, `author.js` 22KB, `download.js` 12KB, all set in
      `runtime/check-bundle-size.mjs`, which is the only place the numbers live

### Ship

- [x] Landing page explaining the product in one screen — 18
- [x] Upload → link flow with no account required — 18; the share link opens
      the app's viewer at `/a/<token>`, not the raw sandbox URL — 20
- [x] App build served on the app origin — the open question flagged on 14 — 20
- [x] Read on real artifacts. The ten-people study was dropped on 2026-08-04 as
      not worth the delay: the two artifacts driven end to end are both
      self-driving applications — a deck with its own navigation and a
      tabbed plan that builds itself in JS — which is the case the phase exists
      to serve. Recorded as a deliberate call, not as evidence it was done

### Delivery stack

v0.1 as a sequence of individually-reviewable branches/PRs, none expected
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
  - [x] v0.1 had been built as two stacks that both branched from `main`
        and never met (07-09d/18 for storage and serving, 10-19 for
        segmentation and the viewer), with `15b-design-system` committed once
        on each side. Neither was v0.1 alone; this merges them and
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
  - [x] v0.2 anchors comments to what the reader selects rather than to a
        structure we inferred — a smaller problem, and one that fails visibly
        instead of silently
- [x] **Ship**
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
  - [x] `21b-viewer-fit` — the frame was a fixed box, so a long document got a
        nested scrollbar inside a viewport-locked iframe while the page itself
        never scrolled. The runtime now reports whether the artifact hides its
        own overflow, and how tall its content is; the viewer either grows the
        frame and lets the page scroll, or leaves a self-scrolling artifact the
        viewport it already had. Two collapse traps found by running it: a
        measurement taken before layout reported zero, and a frame sized to zero
        measures zero forever after — guarded in the runtime, and again by a
        viewport floor in the viewer. Separately, moving the column to
        `min-h-dvh` broke the no-message path, because a percentage height needs
        a definite parent and the iframe silently falls back to 150px; the
        column stays `h-dvh` unless it is actually growing
  - [x] Ten real artifacts uploaded and read — dropped as a gate; see Ship above

---

## v0.2 — Mark

**Goal:** comments and redlines on a read-only artifact. The HTML still never
changes, so there is no conflict resolution in this phase. Keep it that way.

**Exit criteria:** two people on different devices can review the same artifact
simultaneously, see each other, and disagree in writing. This has never been
run, and cannot be until **Deploy** at the end of this file happens — two
devices means two real devices, not two tabs against `wrangler dev`.

**Audit 2026-08-16: the blocker is gone and the check has still not been run.**
Production has been live since 2026-08-13, so two real devices is now a ten
minute test rather than a phase dependency. It is the only thing between this
version and closed; the regeneration loop below moved to v1.0 on purpose.

- [ ] **v0.2 complete** — open on the two-device check alone

### What the pivot changed here

v0.1 stopped inferring structure, so v0.2 cannot lean on any. Three
consequences, each of which shapes the tasks below:

- **Anchors hang off the reader's selection**, not off a unit we chose. There
  is no section to attach a comment to and no filmstrip to hang a count on.
- **The artifact decides what is on screen.** It is a running application: it
  changes slides, opens tabs, and re-renders whenever it likes. A comment's
  target may be present but hidden, or absent until the reader navigates to it.
  The rail has to say so rather than guess a position.
- **Highlights are drawn, not inserted.** Wrapping a selection in a `<mark>`
  would edit somebody else's live document and fight its own rendering. The
  runtime paints highlights in its shadow-root overlay from
  `Range.getClientRects()`; the artifact's own DOM is not touched in this phase
  at all.

### Overlay and anchoring

- [x] Overlay document defined and versioned: artifact revision and entries of
      anchor + kind + body + author + status — 22
- [x] Author shape carries `source: "anonymous"` from day one so accounts are a
      new value later, not a migration — 22
- [x] Anchor format: selected text + a short run of context either side +
      `nth-of-type` path from `<body>` + revision id — 22. Context is capped, so
      an anchor cannot grow with the document it points into
- [x] Resolution order: text first, then the path to choose between duplicate
      matches, then orphan. Text before structure is deliberate and the reason
      is in `PRODUCT.md` — regeneration rewrites markup and keeps wording.
      22 did text and context, returning `ambiguous` with the candidates rather
      than guessing; 23 broke that tie with the path once there was a DOM to
      walk. A tie the path cannot break stays an orphan — 22, 23
- [x] Orphaned anchors displayed as unplaced — never guessed, never dropped.
      The runtime reports what it could not place and the rail says so against
      the thread — 25
- [x] Anchors re-resolved when the artifact mutates its own DOM — a
      MutationObserver on `<body>` rebuilds the text index and repaints, which
      is what makes marks survive an artifact changing its own slide — 23
- [x] Targets that resolve but are off screen are reported as such, and the rail
      offers to reveal them rather than placing them wrongly. Two cases, and
      they are not the same: scrolled away, which the rail can fix, and hidden
      by the artifact itself, which it cannot and must simply say — 25b
- [~] Re-upload is a first-class screen: new revision, re-anchor, and a plain
      report — "11 of 14 carried over, 3 need review". **Audit 2026-08-13:**
      built in `26`, then the screen was removed on `ui/userflow-update`. The
      route still works and the report function still passes its tests, but
      nothing calls either. Re-upload has no UI. Decided at v0.5, where it is
      the difference between changing a file and replacing a link
- [~] Orphans can be dragged back into place or dismissed by the owner —
      dismissal exists (an edit link can delete a thread, and its replies go
      with it). Re-placing lands in 26 for stickies, which have a point to drop
      on. An orphaned text comment has no equivalent gesture: putting one back
      means selecting text again, so it stays named rather than re-placeable.
      It re-places by arming the placement tool the rail already owns, and what
      is genuinely missing is `anchor` on `EntryPatch` — an entry's anchor is
      the one field nothing can currently change — 26
- [x] Test suite covering drift against regenerated artifacts rather than
      hand-edited ones: rewritten markup around identical wording, edited
      wording, deleted passages, and the same sentence appearing twice — 22

### Realtime

- [x] Doc room Durable Object, one per artifact — keyed by artifact id, so both
      of an artifact's tokens land in the same room
- [x] Websocket transport with reconnect and backoff — full jitter, and messages
      written while the socket is down are queued and flushed on open
- [x] Presence: who is here, keyed by reader rather than socket so two tabs are
      one person
- [x] Comment log persisted to DO SQLite
- [x] Concurrent-connection and reconnect tests against the DO — state
      transitions in `worker/lib/overlay-log.test.ts`, socket reconnect in
      `app/src/lib/room-socket.test.ts`, and since `24b` two live sockets
      against a real `DocRoom` running in workerd
      (`worker/src/doc-room.pool.test.ts`): fanout between sockets, presence on
      join and on close, a read-only rejection reaching only the socket that
      earned it, and state surviving into a later connection's snapshot

### How a reader marks up an artifact

Three ways, and they are **two** shapes underneath.

A **comment** anchors to selected text, paints a highlight, and lives in the
rail. A **sticky** is a coloured box that floats over the artifact, pinned to
whatever it was dropped on — the consulting habit, and the reason colour is a
first-class field rather than a theme.

A **callout is not a third kind.** It is a sticky whose `tail` is set. The
default sticky has `tail: null`, which is literally "no pointy thing"; drag the
tip out and it points, drag it back inside the box and it retracts to `null`.
PowerPoint's gesture, kept because it is one degree of freedom instead of a mode
toggle — but PowerPoint stores the tip as a coordinate, and a coordinate is
meaningless the moment the artifact reflows. **The tip is a second anchor**, so
a callout still points at the right chart after a regeneration.

Anchors therefore had to become a union. A text anchor is a quote plus context;
a **region anchor** is an element path plus a _fractional_ point inside its box.
Fractional, not pixel, so it survives the element being laid out at a different
width. Without it, marks could only attach to prose, and the first thing anyone
does to a deck is circle a bar on a chart.

Deliberately not built yet, both cheap once the above exists: **stamps** (a
sticky with an icon and no body — ✓/✗/? for a fast review pass) and **arrows**
(a sticky with a tail and an empty body, which needs no new code at all).

### Comment UI

- [x] Select text in the artifact, leave a comment — selection captured inside
      the runtime and reported up over the bridge
- [x] Highlights painted in the runtime's shadow root and repositioned on
      scroll, resize, and mutation — never written into the artifact
- [x] Element-level marks for artifacts with no selectable text, anchored to the
      element the reader clicked
- [x] Stickies and callouts painted, coloured, and tailed in the shadow root
- [x] Composer UI: drop a sticky, pick a colour, drag it, drag its tail — the
      runtime grew a pointer state machine, keyed reconcile so a gesture is not
      destroyed mid-drag, and an in-place body editor. Drags are held in
      anchor-relative space, so a scroll or a reflow mid-gesture stays honest.
      The tail is part of the sticky's own outline — one SVG path for body and
      spout — and its tip is stored relative to the sticky, so it travels with
      the shape. The retract predicate finally has a caller: a tip dragged back
      inside the box sets `tail: null`
- [x] Comment rail beside the artifact, threads anchored to their selection
- [x] Unresolved count shown in the rail
- [x] Reply, resolve, and reopen
- [x] Commenter names are self-declared and stored locally — still no accounts
- [x] Orphans are named in the rail rather than hidden — the runtime reports
      which marks it could not place, and the rail says so against the thread
- [x] Bridge protocol gains `selection`, `mark-activated`, `render-marks`,
      `set-tool`, `placement`, and `orphans`, then `fit`, `tool-cancelled`,
      `patch-mark`, `set-capabilities`, `place-at`, `edit-mark`, and
      `remove-mark` as direct manipulation landed. No version bump across any of
      them: an unknown type already parses to `null`, so a new message is
      backward-compatible by construction
- [x] Runtime within its minified budget — 32.7KB of 32KB… which is the problem.
      Selection, highlights, stickies, tails, the placement tool, the pointer
      state machine, and the in-place editor left 35 bytes of headroom, so the
      ceiling rises to 40KB with the next branch that needs it. The socket never
      lands here: the room is the app's connection, not the artifact's.
      **Audit 2026-08-13:** raising the ceiling stopped being the answer. `35`
      tried 50KB and was thrown away; `37-split-runtime` split the bundle
      instead, so a reader downloads only what a reader needs

### Ship

- [x] **Copy feedback for your AI tool** — overlay rendered to markdown with
      quoted text and the comments against each, reached from a share menu at
      the right of the viewer bar alongside the copy-link button. Rewritten at
      v1.0: it hands a model a document with no instructions attached, and a
      sticky exports as the words "Sticky note" with nothing to say where it is
- [ ] One full regeneration loop: share, collect, export, regenerate, re-upload,
      re-anchor — run with people who are not you

**The owner dashboard was cut on 2026-08-13**, not deferred. It needed an
owner-scoped index that does not exist — KV is keyed by artifact and token — so
building it meant inventing what "owner" means one phase before accounts do it
properly. Anyone holding an edit link can already do everything the dashboard
was for. **Audit 2026-08-13:** it returns at v0.5, sooner than "with accounts or
not at all" expected. The objection was inventing what "owner" means; the
anonymous owner cookie answers that without inventing accounts.

**Email notification on new comment was cut on 2026-08-12**, not deferred.
Cloudflare's outbound Email Sending needs the Workers Paid plan — only sends to
addresses already verified in your own account are free — and nothing is
deployed, so there is nobody to notify. If it comes back it comes back as its
own decision with a reason attached, which is the treatment `PRODUCT.md` gives
everything else that was dropped.

### Delivery stack

One stack this time, rooted on merged `main`. v0.1's split into two stacks
that never met cost an integration branch and a duplicated commit; the ordering
below keeps each branch dependent only on the one before it.

- [x] `22-overlay-schema` — the overlay document and anchor types in
      `@coedithtml/protocol`, plus anchoring as pure functions: build an anchor
      from a range, resolve one against a document, report orphans. Includes the
      drift suite. No UI and no network, because this is the part that is
      expensive to get wrong and cheap to test.
      **`protocol/` stays dependency-free** — the runtime imports it directly,
      so a Zod import there lands inside the injected script and breaks the
      zero-dependency rule. Hand-written parsers live in `protocol/`; the Zod
      schemas the worker needs for its own request bodies wrap them on the
      worker side.
      Landed DOM-free as well as dependency-free: `protocol/` resolves anchors
      against **text**, which is what makes it testable under the node runner
      and keeps the same code usable from the worker. Mapping a DOM range to and
      from a text offset needs a document, so it belongs to 23
- [x] `23-runtime-selection` — bridge protocol v2; the runtime captures
      selections, builds anchors, paints highlights in its shadow root, and
      re-resolves on mutation. Fails open exactly as v0.1 does.
      The DOM↔text mapping 22 deferred lands here as `dom/text-index`, and with
      it the **path tie-break**: resolution is now genuinely text first, path
      second. A block boundary emits a separating space, because `</p><p>` puts
      no whitespace in the DOM but a reader sees two blocks.
      The runtime now appends **one** element to `<body>` — the closed shadow
      host every mark is drawn into. v0.1's "adds nothing" test became "adds
      one inert host and leaves the author's markup byte-identical", which is
      the invariant that actually matters. 14.1KB of the 20KB budget
- [x] `24-doc-room` — the Doc room Durable Object: websocket transport with
      reconnect and backoff, presence, and the comment log in DO SQLite.
      The room is **authorised at the worker, never at the DO**: the route
      resolves the token, checks the password gate, and refuses any upgrade
      whose `Origin` is not the app — the sandbox included, because an artifact
      script that could open the room would read and write every reader's
      comments. **A view token connects read-only**; the write capability rides
      a header the route sets, which is trustworthy precisely because a DO stub
      is unreachable from outside our own worker.
      The DO stamps `createdAt` itself (client clocks lie, and the rail orders
      by it) and a re-sent entry resolves to the stored one, so a reconnecting
      client cannot double-post. Caps: 500 entries a room, 4000 characters a
      body, 64 connections
- [x] `25-comment-rail` — the rail on the app origin: threads, reply, resolve,
      reopen, unresolved count, self-declared names, and orphans named rather
      than hidden. Off-screen targets were left untreated here and picked up in
      25b, which added the scroll-to message this branch did without.
      Anchors, colours, and the room protocol moved into `@coedithtml/protocol`
      so the rail and the runtime cannot disagree about them. The worker now
      depends on it too, which is what let `UNLOCK_QUERY_PARAM` stop being
      spelled twice
- [x] Five branches landed between `25` and `26` without an entry here, which is
      why this list read as stale for a fortnight. Recorded after the fact:
  - [x] `sticky-direct-manipulation` — a sticky became a shape you can grab:
        pointer state machine, resize, in-place body editing, and a tail drawn
        as part of the note's own outline. Raised the runtime budget from 20KB
        to 32KB and landed at 29.4KB
  - [x] `edit-link-on-the-card` — the share card was handing back the view link,
        so the markup this product exists for was reachable only by digging the
        edit token out of the API response. The view link is still minted and
        independently revocable, just no longer surfaced
  - [x] `identity-on-first-speech` — the viewer opened by demanding a name
        before anything could be read, and the runtime sat inert until one was
        typed. Capabilities now follow the room's write permission and the name
        is collected as part of posting the first comment
  - [x] `comment-at-the-selection` — the runtime had been measuring and posting
        the selection rectangle since `23` and nothing read it. A selection now
        raises a Comment control against the text it belongs to instead of a
        form at the far right edge
  - [x] `one-bar-not-four` — the chrome had grown into four surfaces a
        first-time reader had to find before leaving a note. One bar: copy link,
        who you are, comments, sticky
- [x] `25b-reveal-offscreen` — the scroll-to message `25` left out, plus the
      honest report behind it. The runtime had been collapsing two different
      failures into one `orphaned` bucket, so a comment on a slide the artifact
      was not showing read "the text this points at is gone", which was false.
      `Located` now separates an anchor that resolves nowhere from one that
      resolves onto a box with no area, and `placed` reports offscreen, hidden,
      and orphaned as three lists. Ceiling raised to 40KB; the bundle is 32.9KB
- [x] `26-reupload-reanchor` — revision is a truncated SHA-256 of the uploaded
      bytes, computed at the boundary and carried in the R2 key
      (`artifacts/<id>/<revision>.html`) and in the injected script path
      (`/__coedit/<revision>/runtime.js`), which is what finally gives
      `window.__coedit__.config.revision` a real value. `POST
      /api/artifacts/:editToken/revisions` adds a revision instead of
      overwriting one, so the artifact id — and with it the room and its
      overlay — survives the replacement. The report is derived from the
      placement message rather than computed twice.
      The cache workaround did **not** retire: the revision in that path names
      the artifact, not the runtime build, so `no-cache` stays or a redeploy
      would serve a stale runtime.
      Orphan re-placement covers stickies, which have a point to drop. An
      orphaned text comment still only says its target is gone — re-anchoring
      one means selecting new text, which belongs with the selection affordance
      and is not built
- [x] `27-overlay-export` — **Copy feedback for your AI tool**. `overlayToMarkdown`
      is a pure function in `protocol/`, so the rail and any later export path
      cannot disagree about the format. Resolved threads are labelled rather than
      dropped and orphans get their own section, because an export that silently
      loses feedback is worse than a longer one.
      The bar now splits at one seam: what a reader does on the left, what an
      owner does on the right. `CopyLinkButton` was folded into the menu and
      deleted, and the popover shell `ReaderChip` had grown moved to
      `ui/popover.tsx` on its second use — no dropdown dependency added
- ~~`28-owner-dashboard`~~ — cut on 2026-08-13, see the Ship list above

**Audit 2026-08-13: ten branches landed after `27` and none were recorded here,
which is why this list read as finished while `main` kept moving.** Written down
now, after the fact. Three of them were thrown away rather than shipped, and
`main` was rewound to drop them — `git log main..36-lazy-edit-chunk` still lists
the orphaned commits, so the record needs to say so or the missing ancestry
looks like a mistake.

- [x] `29-three-real-permissions` — a link's permission started meaning
      something. Two token kinds became three: view, suggest, edit
- [x] `30-edit-capability` — the room is told which kind of link opened it, and
      `canEdit` rides the wire separately from `canWrite`
- [x] `31-edit-entries` — `EditEntry` in the overlay, `applyEdits` in the
      runtime, and the DO refusing `not-editable` and `stale`. The overlay could
      hold an edit before anything could make one
- [x] `31-ui-edits` — the redesign; links and stickies got their own colour.
      Numbered `31` twice by accident, merged through `33`
- [x] `32-edits-in-export` — edits carried in `overlayToMarkdown`, so the export
      stopped describing only half the feedback
- [x] `33-download-artifact` — take the file away with you: a download endpoint
      and `download.js`, offering the file with edits, the file with edits and
      comments, or the feedback as markdown
- ~~`34-edit-surface`~~ — abandoned. First attempt at the edit surface
- ~~`35-runtime-budget`~~ — abandoned. Raised the runtime ceiling to 50KB to fit
      the surface in one bundle, which is the decision `37` reversed
- ~~`36-lazy-edit-chunk`~~ — abandoned, still a local branch with five commits
      unreachable from `main`
- [x] `37-split-runtime` — the answer `34`–`36` were groping for: three bundles
      instead of one ceiling. `runtime.js` for every reader, `author.js` fetched
      only once the room reports `canWrite`, `download.js` on its own. The
      loader resolves `null` on failure, so a chunk that never arrives leaves a
      readable document
- [x] `38-edit-surface` — the edit surface, landed into the lazy chunk this
      time. Arms on the text tool and never on the place tool

**Two more landed on `ui/userflow-update`, unmerged as of this audit:**

- [x] `Remove ReplaceFileButton and artifact replacement feature` — the
      re-upload screen `26` built was removed from the app. **The worker route
      survives**: `POST /api/artifacts/:token/revisions` and its tests are
      untouched, so this is a UI removal, not a feature removal. It leaves
      `ReanchorBanner.tsx` and `reanchor-report.ts` with no callers at all —
      dead code, and the re-anchor report from `26` currently has no way to
      reach a reader
- [x] `This largely updates the header UI and user flow` — the header redesign.
      It also deleted `TextEditToggle.tsx`, which was the only thing in the app
      that sent `set-tool` with `"text"`. **Corrected 2026-08-14:** that read at
      the time as a message with no sender left, and it is not — the pen button
      in **Two ways into an edit** is its caller. `"text"` stays in the protocol

**Audit 2026-08-16: eleven more branches landed and none were recorded here
either.** Written down after the fact. Three of them are a feature this file
never planned — a guided tour — and it is live in production.

- [x] `onboarding tour` — a reader who arrives with nothing to upload gets a
      seeded artifact instead of an empty dropzone. `worker/lib/tutorial-deck.ts`
      and `tutorial-seed.ts` mint a room already holding the notes the tour talks
      about, `worker/src/routes/tutorial.ts` answers `/tutorial` on the app
      origin with a redirect into it, `FinishTour.tsx` ends it, and the marketing
      site gained a `/tutorial` launch page. Deployed and answering
- [x] `download fidelity` — stickies are painted into a downloaded file in
      **document** coordinates rather than chased with a scroll listener
      (`runtime/src/download/paint-stickies.ts`), so the copy you send someone
      keeps its notes where they were dropped
- [x] `reimport` — re-uploading a file that Coedit itself produced is recognised,
      its old download script stripped so nothing renders twice, and its stickies
      restored into the new room (`worker/lib/artifact-reimport.ts`, reached from
      `upload.ts`). This is a **new artifact with the old notes**, not a revision
      of the old one, and it is the reason the deleted re-upload screen is no
      longer missed — see the decision at v0.5
- [x] `website SEO` — real metadata, `robots.ts`, `sitemap.ts`, icons, and the
      tutorial launch page. **Not deployed.** See v0.4

---

## v0.3 — Edit

**Goal:** mutation. Text becomes editable in place. This is where two people can
finally disagree at the same moment, and where the complexity genuinely spikes.

**Exit criteria:** someone who is not the owner can fix a typo in a shared
artifact, and the owner can see exactly what changed and put it back.

- [ ] **v0.3 complete**

**Audit 2026-08-13: this version was written as untouched and is roughly
two-fifths built.** `contenteditable` shipped in `38-edit-surface` and is on
`main`. That is an ordering violation against this version's own rule — "restore
to revision, working and tested, before `contenteditable` is switched on
anywhere" — and the safety net it names does not exist in any form.

The rule is not being restored. It is being replaced, because the reason behind
it turned out to be cheaper to satisfy than the mechanism it demanded: an edit is
already an overlay entry that can be deleted, so undo is a delete, not a
snapshot. See **Reversibility lives in the rail** below.

**Fixed 2026-08-14.** Text editing was unreachable for a fortnight:
`TextEditToggle.tsx` was deleted on `ui/userflow-update` and nothing else in the
app sent `set-tool` with `"text"`, so the surface was live in the runtime and
dark in the UI. Both ways in now exist — see **Two ways into an edit**.

**Audit 2026-08-16: four of this version's boxes were checked without being
built, and two were recorded as undone when they were done.**

Wrong in our favour: paste sanitization is real (it was recorded as "Not done"),
and the byte-diff test — the one this file called the single most important test
in the repo — exists and passes.

Wrong against us: **Reversibility lives in the rail is not built.** Four of its
five boxes were checked and only one holds. The rail does not split into
buckets, `ChangeLog.tsx` has no remove control and no **Remove all changes**,
and deleting an edit does not put the text back — `replayEdits`
(`runtime/src/marks.ts:78`) is forward-only, so a removed entry leaves its
replacement on screen. That is the exit criterion of this whole version: *the
owner can see exactly what changed and put it back.* It is now the largest piece
of v0.3, not a finished one.

**Still open at v0.3:** the rail's revert controls, debounced autosave with an
honest state, and local undo/redo. Everything else is built and tested.

**Touch is answered, not deferred. Decided 2026-08-16: accepted as desktop-only.**
There is no long-press fallback and there will not be one before v1. On a phone
the pen in the bar is the only way into an edit, which is a real way in, and the
double-click stays a desktop accelerator. v0.1's exit criterion is that a
stranger can *read* an artifact on their phone, and that is untouched.

### Edit surface

Edits are patches in the overlay, never a re-serialization of the document.
Serializing the live DOM back to HTML would silently normalize attribute
quoting, close unclosed tags, and lowercase element names — modifying the
artifact in exactly the way the whole design forbids.

- [x] `contenteditable` on text nodes only — attributes, structure, and scripts
      stay untouched — 38. `runtime/src/edits/surface.ts`; `blockFor()` walks to
      the nearest block and refuses non-text elements and the overlay host, and
      Enter is swallowed so the browser cannot split a node or insert a `<br>`
- [x] Editing writes into existing nodes and never inserts wrappers — 38. The
      commit is a text diff (`runtime/src/edits/changed-span.ts`), not a
      serialization, and `runtime/src/edits/apply.ts` refuses a span crossing
      two text nodes rather than restructuring to fit
- [x] Each commit appends a patch entry — anchor plus replacement text — to the
      overlay; the stored artifact bytes are never rewritten — 31, 38
- [x] Paste is sanitized to plain text by default, since pasted rich HTML is the
      fastest way to destroy an artifact's styling. **Corrected 2026-08-16: done.**
      `contenteditable="plaintext-only"` is a browser courtesy Firefox does not
      implement, so `onPaste` in `runtime/src/edits/surface.ts:127` takes
      `text/plain` by hand, collapses its whitespace, and inserts one text node
- [x] **Byte-diff test proving the stored artifact is identical before and after
      an editing session. Corrected 2026-08-16: done.**
      `worker/src/routes/edit-session.test.ts` uploads deliberately awkward
      markup — an unclosed `<p>`, a single-quoted attribute, an uppercase tag, a
      tab, and the literal string `</html>` inside a script — applies three
      edits through `applyClientMessage`, re-fetches, and compares bytes. It also
      asserts exactly one appended script survives the session
- [ ] Debounced autosave with an explicit saved / saving / failed state, never
      silent. Today the commit is synchronous on blur or Cmd+Enter, failure
      arrives as a generic rail banner, and there is no success state at all.
      **Scope, decided 2026-08-16:** the surface gains an idle timer that commits
      without ending the session, and the room learns to say when a write landed.
      The anchor is measured against the text as it stood when the caret arrived
      and stays fixed for the session, so every autosave of one session patches
      one entry rather than piling up new ones — `useTextEditing.ts` already
      matches an existing edit on quote and path. No protocol change: an entry is
      *saving* from the moment it is sent, *saved* when the room echoes it back,
      and *failed* on a rejection or a socket that closed with writes pending
- [ ] Local undo and redo stack. **Scope, decided 2026-08-16: it lives in the
      app, not the runtime, and costs the injected bundle nothing.** Every edit
      is already an overlay entry, so undo is the inverse of a room message —
      remove what was added, re-add what was removed, patch back what was
      patched. Bound at the viewer and deliberately inert while
      `surface.isEditing()`, because inside a live caret the browser's own undo
      is the right one and stealing the key would be worse than not binding it.
      Session-scoped and self-scoped: you can undo what you did, not what someone
      else did

### Two ways into an edit

Deliberately redundant, because the two failures are different. A gesture nobody
is told about is fast for whoever stumbles on it and invisible to everyone else;
a button is what makes anyone find the gesture in the first place. Both, then.

- [x] **Double-click text to edit it**, live whenever the link may edit, with no
      mode to enter first. The surface listens on `pointerdown` today and only
      while armed (`runtime/src/edits/surface.ts`), which is the reason arming it
      broke the document underneath: the handler runs in capture and calls
      `preventDefault()` on every click inside a block, so an armed artifact
      could not have its own buttons pressed or its own navigation used.
      Listening for `dblclick` lets single clicks through untouched, which is
      what hosting somebody else's application is supposed to mean
- [x] **A pen in the bar, to the left of the sticky.** It arms the click-to-edit
      mode that already exists — the `"text"` tool and `surface.arm()` both stay
      as they are, so this is the deleted toggle returning in a better place
      rather than a second mechanism. Gated on `room.canEdit`, sitting beside
      `StickyPad` in `ArtifactViewer.tsx`, armed through the pattern
      `useStickyPlacement.ts` already uses
- [x] Arming stays a real mode: while the pen is pressed, a single click belongs
      to the editor rather than to the artifact. That is what the mode costs, and
      it is the reason the double-click exists next to it rather than instead
      of it
- [x] **Clear the selection when an edit begins.** A double-click selects a word
      first, so the app raises its Comment control; then `reportSelection`
      (`runtime/src/author/session.ts:77`) bails for the rest of the session
      because `surface.isEditing()` is true, returning without ever sending
      `selectionMessage(null, null)`. The control would sit there offering to
      comment on a caret nobody asked it about. Send the null selection
      explicitly on begin
- [x] A double-click inside a block already being edited selects a word, the way
      it would anywhere else — the handler bails rather than restarting the
      session
- [x] The artifact's own `dblclick` handlers do not fire for an edit gesture, and
      the word selection is left alone so the caret lands where it was aimed

**Touch: closed 2026-08-16, as acceptable.** There is no double-click on a phone
— double-tap is zoom, and `dblclick` does not fire reliably — so the gesture is
desktop-only and the pen is the only way in on touch. A long-press fallback with
its own gesture timer was the alternative and is not being built: it buys a
second way into editing for the readers least likely to be doing the editing,
and it costs a gesture timer in the bundle that runs inside somebody else's
document. Reading on a phone is unaffected, which is the exit criterion v0.1
actually set.

**Loose end, recorded not scheduled:** `data-coedit-editing`, the attribute the
surface sets on the block being edited, is read by nothing anywhere in the repo.
There is no visual sign an edit is in progress beyond the caret itself.

### Reversibility lives in the rail

Replaces the safety net. The exit criterion is unchanged — the owner can see
what changed and put it back — but a revision system is the wrong shape for it.
Every mark is already an entry the rail can list and delete, so the whole
feature is grouping, a delete control, and one honest confirmation.

**Audit 2026-08-16: this section was checked off and never built.** The four
boxes below were marked done while describing, in the present tense, exactly the
code that is still there. They are corrected to open.

- [ ] The rail splits into three buckets, each collapsible and each carrying its
      own count: **stickies**, **comments**, **direct edits**. Today
      `threadsIn()` (`protocol/src/overlay.ts`) hands back comments and stickies
      as one undifferentiated list and `ChangeLog` hangs off the bottom of
      `CommentRail.tsx`, which is still true as written.
      `isFloating()` and `editsAmong()` already do the separating, so this is
      grouping in `CommentRail.tsx`, not new protocol
- [ ] Deleting an edit in the rail puts the text back. **This is not what
      deleting an entry does today.** `applyEdits` wrote the replacement over
      the original and the original wording is gone from the DOM, so dropping
      the entry leaves the changed text on screen. `replayEdits`
      (`runtime/src/marks.ts:78`) only ever moves forward — it applies edits it
      has not seen and remembers them in `replayed`; nothing walks one back.
      Because the stored bytes are never modified, the correct reset is to reload
      the frame and let `replayEdits` re-apply the surviving edits in order —
      correct by construction, and it costs only whatever slide the artifact was
      on. `artifact-src.ts` already keys the frame on the revision, so the
      mechanism is a nonce in that key rather than new machinery
- [ ] A remove control on each row in `ChangeLog.tsx`, shown only when `canEdit`.
      `CommentThread` has one and `ChangeLog` does not, so a comment can be
      withdrawn today and a change to somebody's words cannot
- [ ] **Remove all changes** on the direct-edits bucket, behind a confirmation
      that names the count. Deleting one edit is small; deleting every edit
      somebody made is not, and it should not be a single unguarded click
- [x] Removing a sticky or a comment keeps working as it does now — those never
      touched the artifact, so there is nothing to put back

### Concurrency

- [x] Edit tokens enforced server-side; a view token cannot mutate, and there is
      a test that tries — 29, 30, 31. Three layers: the route resolves the token
      and sets a header the DO trusts because a stub is unreachable from
      outside; `worker/lib/room-capabilities.ts` derives what the kind may do;
      `worker/lib/overlay-log.ts` refuses `not-editable`. Tried in
      `worker/src/doc-room.pool.test.ts` against a real room in workerd
- [x] Collisions surfaced rather than resolved silently — 31, though not the way
      this list expected. There are no locks; there is optimistic concurrency.
      `EditEntry.rev` counts up, `EntryPatch.ifRev` carries the revision the
      writer saw, and a patch built on a stale one is refused as `stale` and
      reaches the rail as "Someone else changed that text while you were
      typing." Its real limit, stated plainly: two people editing **different**
      spans of the same paragraph do not collide and the later write wins on
      screen
- ~~Soft locks held in the Doc room, scoped to the element being edited~~ — cut
  2026-08-13. Optimistic concurrency shipped first and covers the case that
  actually bites: two people on the same sentence. Locks cost a lock table, a
  TTL, an expiry alarm, and a lock indicator on every editable node, and they
  buy their keep only when collisions are frequent enough to be annoying.
  Nothing has been shared widely enough to know that yet. Revisit when a real
  document produces a real complaint
- ~~Locks expire on a TTL~~ — cut with locks
- ~~Lock state visible on the artifact and in the comment rail~~ — cut with locks

### Around the edges

- [x] Comment anchors survive edits — re-resolve after every commit — 31.
      `replayEdits` in `runtime/src/marks.ts` rebuilds the text index after
      applying, holds off while a caret is live, and suppresses the echo of an
      edit made locally
- [x] Runtime split into a lazily loaded second chunk — 37, which is the second
      half of this line's "under 20KB, or split". Reading a marked-up document
      stays in `runtime.js`; anything only a writer can reach is in `author.js`
- ~~Style panel writing CSS custom properties~~ — cut 2026-08-13. It is a
  different product from the one being built: every other feature here is about
  what a document says, and this one is about how it looks. It also cannot keep
  the promise it implies — an artifact that never declared a custom property
  will not respond to one, so the panel would work on some files and do nothing
  on others, with no way to tell which in advance

### Delivery stack

Written 2026-08-16, in dependency order. Each branch is reviewable on its own and
none needs the one after it.

- [x] `42-green-the-trunk` — done 2026-08-16. `main` had been red since the
      sticky and tutorial work landed: two tests asserting copy that had since
      changed, and two dead identifiers in `CommentRail.tsx`. All four fixed
      themselves when v0.5's stack landed, which is the argument for greening the
      trunk before believing any of it. What actually remained was Prettier
      wanting to reformat `worker/tutorial/deck.html` — 865 diff lines against a
      501-line file — so the deck joined `.prettierignore` beside the other
      served-verbatim content. It is an artifact: stored and served
      byte-for-byte down the same path as a stranger's upload, with the tour's
      seeded notes anchored into it by quoted text and `nth-of-type` path. We do
      not rewrite artifacts, including our own. 77 test files, lint, and
      typecheck all pass on the result
- [ ] `43-rail-buckets` — **Reversibility lives in the rail**, all four boxes.
      Buckets with counts in `CommentRail.tsx`, a remove control per row in
      `ChangeLog.tsx` gated on `canEdit`, **Remove all changes** behind a
      confirmation naming the count, and the frame-reload reset that makes
      deleting an edit actually put the text back. This is the version's exit
      criterion, which is why it is the first real branch rather than the last
- [ ] `44-edit-autosave` — the idle commit in `runtime/src/edits/surface.ts`, and
      saving / saved / failed derived in `useDocRoom.ts` from what the room has
      echoed back. `author.js` is at 18.8KB of 22KB, so the timer fits; if it
      does not, the state is app-side and only the timer is runtime
- [ ] `45-undo-redo` — the inverse-message stack described above, app-side,
      inert while a caret is live. Reuses `43`'s reload path when the thing being
      undone is an edit

### Ship

- [ ] One real artifact edited by three people in the same hour
- [ ] Owner reverts one of those edits without assistance

---

## v0.4 — Site

**Goal:** `coedithtml.com` stops being a parked page.

**Exit criteria:** somebody who has never heard of this lands on the apex,
understands what it does, and gets to the app without asking anyone.

- [ ] **v0.4 complete**

Built 2026-08-14. `website/` had not been touched since the workspace was
scaffolded — the entire site was `<main>Coedit</main>`, and the app's own
landing page carried more of the pitch than the marketing site did.

The copy is written rather than placeheld, because writing prose twice is worse
than writing it once and revising it. The v1.0 pass reads it against the app in
one sweep instead of composing it from nothing.

- [x] Home, how it works, privacy, terms
- [x] An abuse contact, on its own page. Not a nicety: anonymous HTML hosting on
      a shared origin needs a reachable human before it needs anything else
- [x] Deploy target chosen: **static export**. No app logic lives here, so
      `output: "export"` avoids an adapter and a server framework entirely — no
      `@opennextjs/cloudflare`, no new dependency, five prerendered pages. A
      `wrangler.jsonc` serves `out/` as static assets on the apex, and
      `pnpm --filter @coedithtml/website deploy` builds and ships it. The
      constraint from **Deploy** is unaffected: the apex stays on Cloudflare DNS
- [x] Linked both ways. The site's nav and hero point at the app; the app's
      landing page carries a footer back to the site. The viewer's wordmark
      deliberately still goes to the app's own root — from inside a document,
      "up" means the upload page, not marketing
- [x] Point the apex at it and confirm `www` lands somewhere real — done.
      Checked live 2026-08-16: `coedithtml.com` answers 200 with the real site,
      `www.coedithtml.com` 301s to the apex, `app.coedithtml.com` answers 200
- [ ] **Redeploy it. What is live at the apex is an older build than `main`.**
      Its nav offers "How it works", a page that no longer exists in this repo;
      `/tutorial` 404s though the page is built; and `/sitemap.xml` 404s though
      `website/src/app/sitemap.ts` exists. The SEO and tutorial work is shipped
      in git and not on the internet. One
      `pnpm --filter @coedithtml/website deploy`, and it is the user's to run

**The contact address is written and unverified.** The deployed footer offers
`team@coedithtml.com` — one address, not the `privacy@` / `abuse@` / `hello@`
trio this file used to name. **Audit 2026-08-16:** whether Cloudflare Email
Routing actually forwards it cannot be checked from inside the repo, and an
abuse contact that bounces is worse than none. Send one mail to it before v1.

**Landing v0.4 needs the two copy branches too.** `polish-copy-human-direct` and
`trim-site-nav-copy` are unmerged and sit at the bottom of v0.5's stack; the
site's own copy is not final until they land. They are listed once, in the v0.5
stack, rather than twice.

---

## v0.5 — Share on purpose

**Goal:** uploading a file and publishing a link stop being the same act.

**Exit criteria:** you can upload a file, decide who may do what to it and
whether it needs a password, publish, and later change your mind or take it
down — without uploading it again.

- [ ] **v0.5 complete**

On `main`, choosing a file *is* publishing three links. `handleUpload` mints
view, suggest, and edit in one go and the landing page picks which one to show
you; the permission select is frozen the moment the result appears, and "Upload
another" makes a new artifact rather than changing the link you already have.
Password can be set at upload and never again, because no route exists to
change it.

**Audit 2026-08-16: this version was written as not started, was found very
nearly built on branches that were never merged, and landed the same day** as
PRs #41–#44 while the audit was being written. Roughly 3,200 lines, tests
included. The paragraph above describes `main` as it was that morning and is
kept because the shape of what changed is the point: choosing a file used to be
publishing three links, and now it is not.

**Still open here:** the upload-rejection copy, and a deploy — the app in
production is four merged PRs behind.

- [x] Upload and publish become two steps. Upload stores the file and hands back
      a draft; publishing is something you choose — built on
      `worker-share-on-purpose-api` (`worker/src/routes/publish.ts`) and
      `app-publish-and-my-files`. Landed as PR #42
- [x] Permission and password are chosen at the publish step, where there is
      room to explain what each one means — landed as PRs #42 and #44
- [x] An anonymous owner id, minted on first upload into an app-origin cookie —
      `HttpOnly`, `Secure`, `SameSite=Lax`, long-lived, and never on the sandbox
      origin. This is not an account and does not become one here. It is the
      smallest thing that makes "your files" and "your quota" mean anything, and
      it is what v0.6 counts against. Built on `worker-owner-identity`
      (`worker/lib/owner-cookie.ts`, `owner-artifacts.ts`), landed as PR #41. The owner
      index is one KV blob per owner, so it inherits the read-modify-write race
      `rate-limit.ts` has — called out in the module and deferred to v0.6's
      Durable Object move, which is the right trade only because losing a write
      here loses a row in *your own* file list
- [x] **My artifacts** — the owner-scoped list the dashboard was cut for. Built
      (`worker/src/routes/my-artifacts.ts` plus the app screen), landed as PR #44
- [x] Share settings after publishing: change the password, revoke a link,
      delete the artifact — built (`artifact-settings.ts`,
      `regenerate-link.ts`), unmerged. **Deleting is a real delete**, which this
      file files under v0.6; see the note there
- [x] Revocation gets an owner check. Anyone holding a link can currently
      `DELETE` it and kill it for everyone else, and nothing can re-mint it, so
      one reader can permanently unshare a document from fifty others. Closed on
      the stack: five mutating routes authorize through one `requireOwnedArtifact`
      chokepoint, and regeneration means a revoked link can be replaced rather
      than mourned. Landed as PR #42, and the single most important thing in it to review before this ships
- [x] **Decide what happens to re-upload. Decided 2026-08-16: no UI, delete the
      dead code, keep the route.** `ReanchorBanner.tsx` and `reanchor-report.ts`
      go (`remove-reanchor-report` already does it).
      `POST /api/artifacts/:token/revisions` stays: it is tested, it is the only
      way to change an artifact's bytes without changing its links, and it costs
      nothing to leave standing. What made the screen unmissed is `reimport` —
      re-uploading a Coedit download now carries its stickies into the new room,
      which is the case the re-anchor report was written to explain
- [ ] Rejected uploads get room to explain themselves. The words are already
      right (`worker/lib/html-document.ts` — needs a build step, sets its own
      CSP, has no closing tag); they arrive as one red line under the dropzone,
      which makes "wrong file" and "nearly right file" look identical

### Delivery stack

Written 2026-08-16 as seven merges of code that already existed, and closed the
same day. The commits landed under new SHAs through PRs #41–#44, so the branch
names below no longer resolve — they are kept because they name what each piece
was.

- [x] `polish-copy-human-direct` — website and tutorial copy. Closes v0.4's copy
- [x] `trim-site-nav-copy` — drops the privacy link from the site nav
- [x] `remove-reanchor-report` — deletes `ReanchorBanner` and `reanchor-report`,
      which is the decision above. Both files are gone from `main`
- [x] `worker-owner-identity` — the owner cookie and the per-owner index, PR #41
- [x] `worker-share-on-purpose-api` — publish, regenerate, settings, delete,
      PR #42
- [x] `app-share-ui-primitives` — modal, confirm dialog, permission control,
      PR #43
- [x] `app-publish-and-my-files` — the publish step and the file list, PR #44
- [ ] `46-upload-rejection-copy` — the one item on this list nobody has written
      yet: give a refused upload the room to say which of the three things went
      wrong, and what to do about it

**Two reviews this stack was supposed to get and did not, because it landed
while the audit that asked for them was being written.** Neither blocks v0.3;
both block calling v0.5 done:

- [ ] **The owner cookie against the two-origin rule.** It is the first cookie in
      the product, and it must never be settable or readable from the sandbox
      origin. `security-reviewer` exists for exactly this
- [ ] **`requireOwnedArtifact`, and how it treats pre-v0.5 artifacts with no
      recorded owner.** That fallback is the seam where a permissive default
      hands every artifact uploaded before today to whoever asks first

---

## v0.6 — Hold the line

**Goal:** the abuse and cost work. This is the version that makes a wide send
defensible rather than brave.

**Exit criteria:** you can answer an abuse report in minutes, and no one person
can run up your bill at will.

- [ ] **v0.6 complete**

### Take it down, and let it go

- [~] **Delete, for real.** `DELETE /api/artifacts/:token` removes a token
      record and nothing else — the bytes, the metadata, and the Durable Object
      all survive. Revoking every token today makes an artifact permanently
      unreachable *and* permanently stored. One route that clears every
      revision from R2, the metadata from KV, all sibling tokens, and the room.
      **Audit 2026-08-16: built early, and on `main` as of PR #42.** It landed
      there because deleting a file is something you do from a file list, and it
      lives at `DELETE /api/my-artifacts/:id` rather than overloading the token
      path — an artifact id and a share token are indistinguishable 32-hex
      strings, and guessing wrong about which one you were handed is how you
      delete the wrong thing. Verify it against R2 and the room when v0.6 opens
- [ ] **Expire on inactivity: 30 days without a view.** Needs a `lastViewedAt`
      the serve path maintains cheaply, a `triggers.crons` block — there is no
      scheduled handler in the Worker at all today — and a warning to the owner
      before the sweep, not after
- [ ] **Sweep the never-used sooner.** No comments, no edits, and no meaningful
      views seven days after upload, and it goes. Define "meaningful" once, in
      one place, and write the definition down next to the code
- [ ] Nothing above may delete bytes another artifact is still serving — see the
      dedup rules below. Design the two together or the sweep will take a
      document out from under somebody

### Store identical bytes once

Re-uploading a file you already uploaded should cost no new storage. It still
mints a new artifact, new tokens, and an empty overlay — a fresh canvas on the
same bytes. Not the same thing as `POST /revisions`, which already short-circuits
identical bytes *within* one artifact; this is across artifacts.

- [ ] Blobs get their own key space, and metadata points at a digest instead of
      the R2 key being derived from the artifact id. `artifactObjectKey()` in
      `worker/lib/storage-keys.ts` is the seam
- [ ] **Key on the full SHA-256, not `revisionOf()`.** That helper truncates to
      16 hex characters — 64 bits — which is fine for naming a revision inside
      one artifact, whose bytes its own owner chose, and not fine as an address
      shared between strangers: a 64-bit truncation is birthday-attackable at
      roughly 2³² work, and a crafted pair would let one artifact serve
      another's bytes. The truncated value stays as the revision *name* in URLs,
      where it is only a name
- [ ] **Scope dedup to the owner.** Global dedup leaks: an uploader could learn
      whether a given file already exists in the system, and this product hosts
      other people's unreleased work. Owner-scoped closes that, keeps the
      reference set small, and still covers the case actually being asked for —
      the same person uploading the same file twice. Global stays available
      later, as its own decision with a reason attached
- [ ] Reference counting is not KV's job. The same non-atomic read-then-write
      that breaks the rate limiter breaks a refcount, and here the failure mode
      is deleting bytes that are still being served
- [ ] Blobs are never addressable from outside; only artifact ids and tokens
      are. Two artifacts sharing bytes must not share a password gate — the gate
      is checked against artifact metadata before R2 is read, and that order has
      to survive the refactor. Worth a test that tries it
- [ ] Decide once whether existing objects migrate into the blob space or dedup
      applies only to new uploads, and write the answer down rather than leaving
      two layouts undocumented

### Ceilings that hold

- [ ] **Per-owner quota**, keyed on the v0.5 cookie, with IP as the backstop
      rather than the whole defence
- [ ] **Replace the rate-limit primitive.** `worker/lib/rate-limit.ts` reads,
      then writes, non-atomically, on eventually-consistent KV. A burst of
      parallel uploads all read the same count and all pass a limit of 20, and
      each colo keeps its own counter. A Durable Object or Cloudflare's rate
      limiting binding
- [ ] **A global ceiling** on stored bytes and artifact count that refuses new
      uploads, so the limit is a policy rather than an invoice. R2 gives 10GB
      free; today's per-IP ceiling permits 100MB an hour, kept forever
- [ ] **Cap every string the Durable Object stores.** Only `body` is capped, at
      4000. `anchor.quote`, `prefix`, `suffix`, `path`, `entry.id`, and
      `author.displayName` are unbounded, so a one-megabyte quote with an empty
      body passes every check — 500 entries a room, in rooms nothing reclaims
- [ ] **Rate-limit websocket messages.** Nothing counts or throttles them, and
      each one broadcasts to up to 64 sockets. `hello` is handled before the
      write check, so the least privileged connection in the room can flood it
- [ ] **Cache artifact responses.** No `cache-control` on artifact HTML and no
      use of the Cache API anywhere, so every view is a fresh R2 read and every
      download additionally wakes the room

### Close the gaps the audit found

- [ ] **Security headers on the app origin.** `serveAppAsset` returns the raw
      asset response: no CSP, no framing protection, no HSTS, no `nosniff`, no
      referrer policy. It matters more once that origin holds an owner cookie
      and a revoke button
- [ ] **Decide how far to tighten the artifact CSP.** It sets `frame-ancestors`,
      `object-src`, `base-uri`, and `form-action`, but no `default-src`,
      `script-src`, or `connect-src`, so an uploaded script can send anywhere.
      Artifacts legitimately fetch from CDNs, so this is a trade to make
      deliberately, not a free win
- [ ] **CSRF on `POST /revisions`.** It takes `multipart/form-data`, which
      browsers send without a preflight, making it the one state-changing route
      any origin can fire
- [ ] PBKDF2 from 100k to 600k iterations, current OWASP guidance
- [ ] The download filename crash: any code point above U+00FF makes
      `Headers.set` throw, so every download of a file named in Chinese,
      Japanese, or with an emoji returns a 500
- [ ] The catastrophic-backtracking risk in `worker/lib/html-document.ts`, run
      against five megabytes of someone else's text
- [ ] Stop storing the full sibling-token triple in every token record. A view
      token's record contains the edit token today. It is filtered on the way
      out, so one careless future handler is a privilege escalation
- [ ] Turnstile on upload — decide it, do not drift into it
- [ ] **Write the assessment down in this file.** What an artifact script can
      and cannot reach; what the shared `workers.dev` sandbox origin means, given
      that isolation between two artifacts is one unguessable string rather than
      an origin boundary; and what is accepted risk rather than an open task

---

## v1.0 — Ship

**Goal:** send it to a large number of people.

**Exit criteria:** you send the link to a room full of strangers and spend the
next day reading their comments rather than fielding confusion or abuse.

- [ ] **v1.0 complete**

### Say it plainly

- [ ] One language pass, site and app together, against the Voice section of
      `PRODUCT.md`: controls say what happens, errors say what broke and what to
      do, empty states invite an action. Strip anything that reads as generated
      rather than written. Doing site and app in one sweep is the point — they
      have never been read side by side

### The handoff to the AI tool

The export works and reads poorly. Two fixes, and deliberately no more than two,
because the real answer is the plugin in **Post-v1** and this is the thing it
replaces.

- [ ] **Wrap the export in a shell prompt.** It currently hands a model a
      document titled "Feedback on X" with no instruction attached and lets the
      model guess what to do with it. Say what the file is, what the reader
      wants changed, and what to leave alone
- [ ] **Give a sticky something to sit next to.** A sticky exports as the words
      "Sticky note" and nothing else, because a `RegionAnchor` carries a path
      and two fractions and no text at all — so the model is told a note exists
      and never where. Capture a short excerpt of whatever it was dropped on at
      the moment it is dropped, and group the sticky under that text like a
      comment. That is the whole fix; do not build a second anchoring system for
      it
- [ ] Leave a TODO in `protocol/src/export-markdown.ts` pointing at the plugin,
      so the next person to open the file knows this is a stopgap by choice

### Prove it on the real thing

- [ ] Upload through the deployed UI in a browser, open the link in a private
      window, read it on a phone. The API path is verified; the path a person
      actually takes is not
- [ ] Push a 5MB body at production. The upload ceiling is the last gate tested
      only locally
- [ ] Verify expiry and delete against production, including the case that
      matters most: two artifacts sharing bytes, one deleted, the other still
      serving
- [ ] One full regeneration loop — share, collect, export, regenerate,
      re-upload, re-anchor — with people who are not you. Carried from v0.2,
      where it was the last open item. It belongs here: it is the same thing as
      a real launch

---

## Post-v1

**Goal:** the expensive tail. Every item below is a real project, not a task.

**Gate — do not start until both are true:**

- [ ] v1.0 has been live for a month
- [ ] A paying user has asked for a specific item below **by name**

**Then pick exactly two.** Five half-built features are indistinguishable from a
dead product.

- [ ] **Two selected, written down, dated**

### The menu

- [ ] **Accounts and billing.** Named sign-in, per-recipient edit links,
      individual revocation, and attribution that survives a forwarded link.
      The `author.source` field already anticipates this, and v0.5's owner
      cookie is deliberately the smallest thing that works — this is what it
      upgrades into rather than something built beside it.
- [ ] **A plugin for the AI tools.** The round trip stops being copy and paste:
      the export becomes a connector that speaks to whatever made the artifact.
      This is the intended replacement for **The handoff to the AI tool** in
      v1.0, which is why that work is deliberately kept small — improve the
      prompt, group the stickies, stop. Left unspecified beyond that, for the
      same reason the round-trip item below is: the tooling will have changed
      twice before it is worth designing.
- [ ] **Automated round-trip.** Push the overlay to a model and pull back a new
      artifact revision without leaving the app. Deliberately unspecified — the
      tooling will have changed twice before this is worth designing.
- [ ] **Gated sharing.** Email-domain allowlist and link expiry, on top of the
      password v0.5 makes changeable. The middle tier between fully public and
      org-only that nobody currently offers. Cheapest item here and the most
      defensible.
- [ ] **PPTX and PDF export.** Rendered from the artifact itself. Most requested in interviews, least used in practice — believe
      the second half of that sentence.
- [ ] **Per-node CRDT.** True simultaneous editing inside one region. Roughly a
      month. Only worth it if the optimistic-concurrency rejection in v0.3 is
      demonstrably losing you users.
- [ ] **Soft locks.** Cut from v0.3 with a reason; it returns here if a real
      document produces a real complaint, and not before.
- [ ] **Custom domains and white label.** Serve artifacts from a client's own
      domain. Mostly DNS and certificate plumbing, plus a second sandbox origin
      strategy — think it through before promising it.
- [ ] **Offline editing.** Requires the CRDT above. Do not select independently.

- [ ] **Post-v1 complete** — meaning the two selected items shipped, not the list
      cleared

---

## Deploy — put the thing on the internet

Not a phase, and deliberately last: it is the one thing standing between the
code and a link somebody else can open. Written for v0.1 and now carrying
v0.2 as well, which is why v0.2's exit criterion waits on it.

**What is live as of 2026-08-13.** The real Worker, verified against production
rather than `wrangler dev`. Version `9cac3c0c`, deployed from the `production`
environment:

- `app.coedithtml.com` → the app; serves its own shell for an artifact token and
  never the artifact
- `coedit.coedithtml-worker.workers.dev` → artifacts, with
  `frame-ancestors app.coedithtml.com` and `nosniff`; app assets 404 here
- `coedithtml.com` (apex, marketing) → still parked

**Updated 2026-08-16, checked live.** The apex is no longer parked: it serves the
real marketing site, and `www` 301s to it. The Worker has moved on too — the
tutorial route answers, so production carries at least the tour work. Two things
are behind `main`, both a deploy rather than a task:

- The **website** at the apex is an older build. Its nav offers a page this repo
  no longer has, `/tutorial` and `/sitemap.xml` 404, and the SEO work is live in
  git only
- Nothing from v0.5's stack is deployed, because nothing from it is merged

Checked live: upload → link → fetch, with the stored bytes byte-identical and
exactly one appended script; the revision path `/__coedit/<revision>/runtime.js`
serving the runtime with `appOrigin` and `revision` injected; a websocket
upgrade to a real `DocRoom` answering `101`, so the `v1` SQLite migration
applied; that same upgrade refused `404` from a forged `Origin`; the password
gate refusing without a grant and issuing one for the right password; re-upload
minting a new revision, refusing a view token `403`, and changing what is
served; and revoking the view token killing it on both origins while the edit
token stays live.

**One defect the deploy surfaced.** `room.ts` was stamping the overlay with the
artifact id where the revision belongs — correct before `26`, wrong the moment a
real revision existed. Fixed and redeployed.

**Decided on 2026-08-12.** The app ships to `app.coedithtml.com`, which is what
the `production` block already declares, so no host config changes. Cloudflare
stays the host: `DocRoom` is a Durable Object, artifacts are R2 objects, and one
Worker serving two origins by `Host` is the isolation. It is also free at this
scale — SQLite-backed Durable Objects run on the Workers Free plan, R2 includes
10GB and charges nothing for egress, and Workers allows 100,000 requests a day.

**The sandbox does not move to `sandbox.coedithtml.com`, however tempting.** A
subdomain is a separate origin but the *same site*, and this product's isolation
is site-level: an artifact script could set a cookie on `Domain=coedithtml.com`
and have it ride along to the app, and any cookie the app later sets at the
registrable domain would be handed to artifacts. `workers.dev` is on the public
suffix list, so today's host is genuinely cross-site. If its shared reputation
becomes a problem, the answer is a second *registrable domain*, not a subdomain
of this one.

- [x] `pnpm deploy` against the production environment. The script did not exist
      until the post-merge audit added it; a bare `wrangler deploy` picks up the
      top-level vars, which are the localhost dev hosts, and every real request
      would classify as an unknown origin and 404
- [x] Create the production KV namespace and R2 bucket. The buckets already
      existed; the KV id was indeed one namespace shared by both blocks, so
      production now has `4ec09f8643814541ba2471dad38a887a` of its own and local
      dev can no longer write production metadata
- [x] Confirm the two origins are genuinely separate in production, which the
      roadmap had claimed since `03` on the strength of config alone
- [x] The first deploy also carried a Durable Object. `migrations` tag `v1`
      declares `DocRoom` as a `new_sqlite_classes` entry; it applied cleanly and
      a live upgrade answers `101`. `24b` exercised it in workerd first, though
      two things that run did not prove: the pool pins an older workerd that
      falls back from the `2026-07-01` compatibility date, and storage isolation
      is off because Windows will not unlink the room's SQLite file mid-run, so
      tests are kept apart by naming a room each instead
- [x] Check the password gate, revocation, and re-upload against the deployed
      Worker rather than a local one
- [ ] The upload ceiling is the one gate still only tested locally — refusing a
      5MB body against production means actually pushing one. **Now tracked as a
      v1.0 item**, since it is the same task
- [ ] Upload a real artifact through the deployed landing page **in a browser**,
      open the returned link in a private window, and read it on a phone. The
      API path is verified; the UI path over the wire is not. **Also a v1.0
      item** — it is the launch test, not a leftover
- [x] Confirm the account's `workers.dev` subdomain really is
      `coedithtml-worker` — it is, so the sandbox host in config was right
- [x] Deploy the marketing site to the apex, or leave it parked deliberately.
      **Decided: it ships, at v0.4** — parking it deliberately stopped being an
      option once v1 meant sending the link to strangers, who arrive at the apex
      before they arrive anywhere else. Shipped on Cloudflare rather than Vercel
      in the end: `website/wrangler.jsonc` serves the static export at
      `coedithtml.com` as a custom domain, so the DNS constraint the alternative
      carried never came up. Live and confirmed 2026-08-16. **Keeping it current
      is a v0.4 item** — what is deployed is already behind `main`
