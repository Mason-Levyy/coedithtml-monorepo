# coeditHTML — Product Definition

## What it is

coeditHTML takes a single-file HTML artifact — the kind Claude, ChatGPT, or v0
produces — and turns it into a link. Anyone who opens the link sees the artifact
running exactly as its author built it. Later they can comment on it and edit
it. No account, no install, no build step.

The user is someone who generated a good-looking artifact and now needs three
non-technical people to react to it. Today they screenshot it into Slack or
export it to PowerPoint and lose everything interactive. coeditHTML is the
version where the artifact stays the artifact.

## The non-negotiable constraint

**We never modify the uploaded HTML.** Not on upload, not on serve, not to
apply an edit. The file is stored byte-for-byte and returned
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

- **App origin** (`app.coedithtml.com`) — the chrome. Title bar, share controls,
  comment rail, the owner's own list. The only origin that may hold a cookie.
- **Sandbox origin** (`coedit.coedithtml-worker.workers.dev`) — serves artifacts
  inside a cross-origin `<iframe>`. Never receives a credential and shares
  nothing with the app origin.

The sandbox deliberately does **not** live on a subdomain of `coedithtml.com`. A
subdomain is a separate origin but the same *site*, and this product's isolation
is site-level: an artifact could set a cookie at the registrable domain and have
it ride along to the app. `workers.dev` is on the public suffix list, so today's
host is genuinely cross-site. If its shared reputation becomes a problem the
answer is a second registrable domain, never a subdomain of this one.

The artifact runs sandboxed with `allow-scripts allow-same-origin` (same-origin
here means the *sandbox* origin, not ours) and explicitly without
`allow-top-navigation` or `allow-popups`, so an artifact cannot redirect or
overlay the host page.

The injected runtime lives inside the iframe. It has full DOM access to the
artifact and zero access to us. It talks to the chrome over `postMessage` with
strict origin checks in both directions and a versioned message schema.

```
[ app origin ]  chrome, share bar, comment rail
      |  postMessage (origin-checked, versioned)
[ sandbox origin ]  iframe: artifact HTML + injected runtime
      |  websocket
[ durable object ]  doc room: presence, comments, revisions
```

## The artifact runs itself

The artifact is an application, not a document to be taken apart. It arrives
with its own layout, its own navigation, its own key handling — increasingly it
arrives as a working deck, dashboard, or tool that already knows how it wants to
be read. We host it and frame it. We do not segment it, group it, or decide
where its slides begin.

This was not the original plan. The first design put a segmentation cascade in
the runtime — explicit markers, then semantic breaks, then a layout heuristic,
then a single-slide fallback — and rendered a filmstrip from whatever it found.
It was the largest and most delicate part of v0.1, and it was wrong in a way
that got worse as artifacts got better: a self-driving pitch deck with seven
sections in a stage wrapper was read as three "pages", so the chrome and the
artifact disagreed about what the reader was looking at, on screen, at the same
time. Every artifact shape that did not match the heuristics was a bug report,
and the space of shapes is unbounded.

What is left is smaller and does not degrade:

- Store the bytes. Serve the bytes. Frame them on a sandbox origin.
- Append one script tag after `</html>` — a pure append, never a
  search-and-replace — so there is a seam to build on.
- The injected runtime reports that the frame came up and what the document
  calls itself. Nothing else.
- The chrome is a thin bar: the title and a way to copy the link.

Later phases add commenting and editing **on top of** the artifact, anchored to
what the reader selects rather than to a structure we inferred. Anchoring to a
selection is a smaller problem than segmenting a document, and it fails visibly
rather than silently.

## The overlay document

The single most important data structure in the product. The artifact is
immutable bytes; the overlay is everything humans added, kept entirely separate
and fully serializable:

```
{ artifactRevision, entries: [ { anchor, kind, body, author, status } ] }
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
markdown — quoted text and the comments against each. No integration, no API
key, works with every model and with copy-paste. Anything
more automated is a post-v1 decision, and the tooling in this space will have
changed twice by then. Build the export; stay uncommitted about the rest.

### Anchoring

Every overlay entry needs an address that outlives a new version of the
artifact. An anchor describes **what the reader selected**, not a structural
unit we picked for them. Each one stores four things:

- the exact selected text,
- a short run of text either side of it, so the same phrase appearing twice can
  be told apart,
- a structural path (an `nth-of-type` chain from `<body>`), used only to
  disambiguate,
- the artifact revision it was created against.

Resolution tries the text first, then uses the path to choose between multiple
matches, then gives up and marks the anchor orphaned. Orphans are shown to the
user as unplaced rather than silently dropped or silently misplaced. Never
guess.

Text first, path second, is the opposite of the obvious order, and it follows
from the main path being regeneration. When a model rewrites an artifact it
produces entirely new markup for substantially the same words — every
structural path breaks while nearly every sentence survives. Structure is the
volatile thing here and text is the stable one, so the durable identifier is
the quote and the path is a tie-breaker.

Re-upload is a first-class flow with its own screen, not a resilience feature:
after re-anchoring, report plainly — "14 comments, 11 re-placed, 3 need review" —
and let the owner drag orphans back into place or dismiss them.

### Identity

Viewers are anonymous. Names are self-declared and stored against the link
locally, and every entry carries an `author` of
`{ id, displayName, source: "anonymous" }`. Accounts are a post-v1 feature, so
the only thing required now is that `source` exists — adding `"account"` later
is then a new value, not a migration.

## The injected runtime

Highest-risk code in the repo. It runs inside someone else's document.

- Zero dependencies, vanilla DOM, and a minified budget per bundle. It ships as
  three: `runtime.js` for everyone who opens a link, `author.js` fetched only
  once the room says you may write, `download.js` on its own. **The reader's
  bundle is the one that matters** — anything only a writer can reach belongs in
  the authoring chunk, and anything needed to *read* an edited document does
  not. The numbers live in `runtime/check-bundle-size.mjs` and nowhere else.
- All of its own UI inside a shadow root so styles cannot collide either way.
- One namespaced global.
- **Fails open.** If the runtime throws or the socket dies, the artifact must
  still run correctly. Broken chrome is acceptable; a broken artifact is not.

## Feature set

Versions, ending at v1. **v1 means the link is ready to send to a large number
of strangers** — not accounts, not billing, but clean, honest, and defended
against the obvious abuse of an anonymous upload endpoint.

**v0.1 — Serve.** Upload a single HTML file, get a link. The artifact runs
as itself inside a sandboxed frame, under a thin bar carrying the title and the
link. View and edit tokens. Optional password. Anonymous viewers, no sign-in.

**v0.2 — Mark.** Comments anchored to what the reader selects, kept in the
overlay. Live presence. Resolve and reply. Unresolved counts in the comment
rail. Re-upload with re-anchoring, and overlay export for the regeneration
loop.

**v0.3 — Edit.** Text editable in place. Undo is a delete: every edit is an
overlay entry the rail can list and remove, so the artifact goes back to what it
said without a revision system underneath it. Do not build toward this during
v0.1 and v0.2 beyond keeping anchors revision-aware.

**v0.4 — Site.** The marketing site stops being a parked page.

**v0.5 — Share on purpose.** Uploading a file and publishing a link become two
acts, so permission and password are chosen deliberately. An anonymous owner id
in a cookie — not an account — gives someone their own files back.

**v0.6 — Hold the line.** Deletion, expiry, quotas, and ceilings. The version
that makes a wide send defensible rather than brave.

**v1.0 — Ship.** One language pass across site and app, an export a model can
actually act on, and the whole thing proven against production.

**Post-v1.** A menu, not a plan: accounts and billing, a plugin for the AI
tools, gated sharing, file export, per-node CRDTs, custom domains. Exactly two
get built, and only once a paying user names one.

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
