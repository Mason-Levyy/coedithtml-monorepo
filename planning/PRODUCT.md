# coeditHTML — Product Definition

## What it is

coeditHTML takes a single-file HTML artifact — the kind Claude, ChatGPT, or v0
produces — and turns it into a link. Anyone who opens the link reads it as a
deck: one section on stage, thumbnails along the bottom. Later they can comment
on it and edit it. No account, no install, no build step.

The user is someone who generated a good-looking artifact and now needs three
non-technical people to react to it. Today they screenshot it into Slack or
export it to PowerPoint and lose everything interactive. coeditHTML is the
version where the artifact stays the artifact.

## The non-negotiable constraint

**We never modify the uploaded HTML.** Not on upload, not on serve, not to make
slides, not to apply an edit. The file is stored byte-for-byte and returned
byte-for-byte with one script tag appended **after `</html>`** — a pure append,
never a search-and-replace. Browsers hoist it correctly, and it avoids the
failure mode where an artifact has no literal closing body tag or contains the
string inside its own JavaScript.

The reason is simple: artifacts are single files with tightly coupled inline
CSS. A selector like `body > div:nth-child(3)` breaks the instant you wrap
something. Any feature that requires restructuring the artifact is the wrong
feature.

Everything a human contributes — navigation state, comments, edits, statuses —
lives in a separate **overlay document**, described below. That separation is
what makes the constraint survivable rather than merely aspirational.

## Architecture

Two origins, always:

- **App origin** (`coedithtml.com`) — the chrome. Filmstrip, stage controls,
  comment rail, dashboard. Holds the session cookie.
- **Sandbox origin** (`artifact-sandbox.net`) — serves artifacts inside a
  cross-origin `<iframe>`. Never receives a credential and shares nothing with
  the app origin.

The artifact runs sandboxed with `allow-scripts allow-same-origin` (same-origin
here means the *sandbox* origin, not ours) and explicitly without
`allow-top-navigation` or `allow-popups`, so an artifact cannot redirect or
overlay the host page.

The injected runtime lives inside the iframe. It has full DOM access to the
artifact and zero access to us. It talks to the chrome over `postMessage` with
strict origin checks in both directions and a versioned message schema.

```
[ app origin ]  chrome, filmstrip, comment rail
      |  postMessage (origin-checked, versioned)
[ sandbox origin ]  iframe: artifact HTML + injected runtime
      |  websocket
[ durable object ]  doc room: presence, comments, revisions
```

## Segmentation — how HTML becomes slides

This is the hardest problem in the product and the place to spend real effort.

**Run after scripts, not before.** Many artifacts render nothing until their JS
executes. The runtime waits for `load`, then for a short quiet period with no
DOM mutations, and only then segments. Parsing the raw HTML string server-side
is wrong and will fail on every JS-driven artifact.

**Cascade of strategies, first confident match wins:**

1. **Explicit markers.** `[data-slide]` elements, or `<section>` elements as
   direct children of `body` / `main` / the primary container. Two or more hits
   means done. Highest confidence.
2. **Semantic breaks.** `<hr>` elements, or heading-led grouping: find the
   shallowest heading level occurring three or more times at consistent depth,
   and start a new slide at each occurrence.
3. **Layout heuristic.** Walk the direct children of the primary scroll
   container and accumulate them into groups at a **fixed virtual height**
   (900px), never the actual viewport. Using the real viewport would give a
   phone and a laptop different slide counts for the same link, so two people
   discussing "slide 4" would be looking at different content.
4. **Single slide.** The artifact is an application, not a document — a
   calculator, a dashboard, a game. This is a correct result, not a failure. The
   filmstrip collapses and the UI says so plainly rather than inventing
   divisions.

**A slide is a range, never a wrapper.** The output is
`{ index, startChild, endChild, label }` referencing existing children of the
container. Rendering a slide means scrolling to it, not moving it.

**Two view modes.** *Flow* is the default and is always safe: the artifact
scrolls normally and the filmstrip acts as scroll-spy plus jump navigation.
*Stage* shows one slide and hides the rest; it is opt-in because hiding siblings
can break sticky headers and absolute positioning. When the runtime detects
`position: sticky` or `fixed` in the artifact, Stage is offered with a warning
rather than made default.

**Re-segmentation.** A debounced `MutationObserver` watches the container. Only
structural changes to top-level children trigger re-segmentation; text changes
do not. Slide indices are recomputed and the filmstrip updates without losing
the reader's position.

**Reading profiles.** The cascade produces a guess, and the guess is shown, not
hidden: the viewer carries a small `Reading as: Slides ▾` control offering
Slides, Pages, and App. Do not ask at upload — guessing and offering a
correction is the same outcome with none of the friction, and the uploader often
does not know yet how it will be read.

The profile is a property of the link, not a viewer preference, so everyone sees
identical slide numbers. Slides is the default and the priority case: favor
explicit markers and semantic breaks, Stage mode available. Pages assumes a long
scroll and stays in Flow. App skips segmentation and renders one frame.

## The overlay document

The single most important data structure in the product. The artifact is
immutable bytes; the overlay is everything humans added, kept entirely separate
and fully serializable:

```
{ artifactRevision, profile, entries: [ { anchor, kind, body, author, status } ] }
```

`kind` covers comments, replies, and later text edits. One structure does three
jobs, which is why it is worth getting right before anything depends on it:

1. **Applied at serve time.** The runtime renders the overlay over the artifact.
   Edits are patches keyed to anchors, applied to the live DOM — never a
   re-serialization of the document back to HTML.
2. **Re-anchored on re-upload.** See below.
3. **Exported as a prompt.** Rendered to markdown, the overlay is a complete
   feedback package for any AI tool.

### The regeneration loop

The real workflow is a cycle, not a one-way trip: share a link, collect
comments, feed them back to whatever model made the artifact, re-upload the
result. This happens every round, so treat it as the main path rather than an
edge case.

The deliberately low-tech version ships first and may be all that is ever
needed: a **Copy feedback for your AI tool** button that dumps the overlay as
markdown — slide labels, quoted text, and the comments against each. No
integration, no API key, works with every model and with copy-paste. Anything
more automated is a Phase 4 decision, and the tooling in this space will have
changed twice by then. Build the export; stay uncommitted about the rest.

### Anchoring

Every overlay entry needs an address that outlives a new version of the
artifact. Each anchor stores three things:

- a structural path (an `nth-of-type` chain from the container),
- a short hash of the node's normalized text content,
- the artifact revision it was created against.

Resolution tries path first, then hash anywhere in the document, then gives up
and marks the anchor orphaned. Orphans are shown to the user as unplaced rather
than silently dropped or silently misplaced. Never guess.

Re-upload is a first-class flow with its own screen, not a resilience feature:
after re-anchoring, report plainly — "14 comments, 11 re-placed, 3 need review" —
and let the owner drag orphans back into place or dismiss them.

### Identity

Viewers are anonymous. Names are self-declared and stored against the link
locally, and every entry carries an `author` of
`{ id, displayName, source: "anonymous" }`. Accounts are a Phase 4 feature, so
the only thing required now is that `source` exists — adding `"account"` later
is then a new value, not a migration.

## The injected runtime

Highest-risk code in the repo. It runs inside someone else's document.

- Zero dependencies, vanilla DOM, 20KB minified ceiling.
- All of its own UI inside a shadow root so styles cannot collide either way.
- One namespaced global.
- **Fails open.** If segmentation throws or the socket dies, the artifact must
  still render and read correctly. A broken filmstrip is acceptable; a broken
  document is not.

## Feature set

**Phase 1 — Serve.** Upload a single HTML file, get a link. Filmstrip viewer
with keyboard navigation and a reading profile control. View and edit tokens.
Optional password. Anonymous viewers, no sign-in.

**Phase 2 — Mark.** Comments anchored to slides and text ranges, kept in the
overlay. Live presence. Resolve and reply. Unresolved counts badged on the
filmstrip. Re-upload with re-anchoring, and overlay export for the regeneration
loop.

**Phase 3 — Edit.** Text editable in place, section-level locks, and a full
revision history built before any of it is switched on. Do not build toward this
during Phases 1 and 2 beyond keeping anchors revision-aware.

**Phase 4 — Converge.** A menu, not a plan: accounts and identity, gated
sharing, file export, automated AI round-trip, per-node CRDTs, custom domains.
Exactly two get built, and only once a paying user names one.

## Deferred indefinitely

JSX and multi-file uploads, and analytics on who read what. Neither is on the
roadmap and neither should be built on the way to something else. If one comes back, it comes back as its own decision with a
reason attached — not as a small addition to a task that was about something
else.

## Voice

Plain and unfussy. Controls say what happens: "Share link," not "Submit."
Errors state what broke and what to do. Empty states invite an action. The
product never calls itself AI-powered, because it is not — it hosts things AI
made.
