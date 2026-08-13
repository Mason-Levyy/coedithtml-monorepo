# coeditHTML — Roadmap

Four phases. Check the phase box only when every task under it is done and the
exit criteria hold. Read `PRODUCT.md` first — it explains why several of these
tasks look stranger than they need to.

---

## Phase 1 — Serve

**Goal:** upload a single HTML file, get a link, open it and use the artifact
exactly as its author built it. No comments, no editing, no realtime.

**Exit criteria:** you can hand the link to someone who has never heard of the
product, on their phone, and the artifact works for them the way it works for
you — its own layout, its own navigation — without asking a question.

- [x] **Phase 1 complete** — 2026-08-04, code-complete and verified against
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
- [x] Runtime build stays under the minified budget, enforced in CI — 21b. The
      budget was 20KB through Phase 2 and rose to 32KB when direct manipulation
      landed

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

## Phase 2 — Mark

**Goal:** comments and redlines on a read-only artifact. The HTML still never
changes, so there is no conflict resolution in this phase. Keep it that way.

**Exit criteria:** two people on different devices can review the same artifact
simultaneously, see each other, and disagree in writing. This has never been
run, and cannot be until **Deploy** at the end of this file happens — two
devices means two real devices, not two tabs against `wrangler dev`.

- [ ] **Phase 2 complete**

### What the pivot changed here

Phase 1 stopped inferring structure, so Phase 2 cannot lean on any. Three
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
- [x] Re-upload is a first-class screen: new revision, re-anchor, and a plain
      report — "11 of 14 carried over, 3 need review"
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
      lands here: the room is the app's connection, not the artifact's

### Ship

- [x] **Copy feedback for your AI tool** — overlay rendered to markdown with
      quoted text and the comments against each, reached from a share menu at
      the right of the viewer bar alongside the copy-link button
- [ ] One full regeneration loop: share, collect, export, regenerate, re-upload,
      re-anchor — run with people who are not you

**The owner dashboard was cut on 2026-08-13**, not deferred. It needed an
owner-scoped index that does not exist — KV is keyed by artifact and token — so
building it meant inventing what "owner" means one phase before accounts do it
properly. Anyone holding an edit link can already do everything the dashboard
was for. It returns with accounts in Phase 4 or not at all.

**Email notification on new comment was cut on 2026-08-12**, not deferred.
Cloudflare's outbound Email Sending needs the Workers Paid plan — only sends to
addresses already verified in your own account are free — and nothing is
deployed, so there is nobody to notify. If it comes back it comes back as its
own decision with a reason attached, which is the treatment `PRODUCT.md` gives
everything else that was dropped.

### Delivery stack

One stack this time, rooted on merged `main`. Phase 1's split into two stacks
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
      re-resolves on mutation. Fails open exactly as Phase 1 does.
      The DOM↔text mapping 22 deferred lands here as `dom/text-index`, and with
      it the **path tie-break**: resolution is now genuinely text first, path
      second. A block boundary emits a separating space, because `</p><p>` puts
      no whitespace in the DOM but a reader sees two blocks.
      The runtime now appends **one** element to `<body>` — the closed shadow
      host every mark is drawn into. Phase 1's "adds nothing" test became "adds
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
- [ ] Revision list with author, timestamp, and the passages each one touched
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

- [ ] Soft locks held in the Doc room, scoped to the element being edited —
      there are no sections to lock, so the lock unit is whatever node the
      caret is in
- [ ] Locks expire on a TTL — a closed laptop must not freeze a document
- [ ] Lock state visible on the artifact and in the comment rail
- [ ] Last-write-wins per locked element, with the collision surfaced to both
      people rather than resolved silently
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

---

## Deploy — put the thing on the internet

Not a phase, and deliberately last: it is the one thing standing between the
code and a link somebody else can open. Written for Phase 1 and now carrying
Phase 2 as well, which is why Phase 2's exit criterion waits on it.

**What is live as of 2026-08-13.** The real Worker, verified against production
rather than `wrangler dev`. Version `9cac3c0c`, deployed from the `production`
environment:

- `app.coedithtml.com` → the app; serves its own shell for an artifact token and
  never the artifact
- `coedit.coedithtml-worker.workers.dev` → artifacts, with
  `frame-ancestors app.coedithtml.com` and `nosniff`; app assets 404 here
- `coedithtml.com` (apex, marketing) → still parked

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
      5MB body against production means actually pushing one
- [ ] Upload a real artifact through the deployed landing page **in a browser**,
      open the returned link in a private window, and read it on a phone. The
      API path is verified; the UI path over the wire is not
- [x] Confirm the account's `workers.dev` subdomain really is
      `coedithtml-worker` — it is, so the sandbox host in config was right
- [ ] Deploy the marketing site to the apex, or leave it parked deliberately.
      Vercel is fine for it — no app logic lives there — as long as
      `coedithtml.com` stays on Cloudflare DNS, which the `app.` custom domain
      needs, and the apex records are left unproxied
