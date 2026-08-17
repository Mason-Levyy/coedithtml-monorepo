# coeditHTML — Roadmap

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
      strategy — think it through before promising it. **This is also where the
      one uncomfortable thing in v0.6's assessment gets fixed**: every artifact
      shares the sandbox origin today, so isolation between two of them is an
      unguessable token rather than an origin boundary, and the answer is a
      second registrable domain with one artifact per subdomain of it. Worth
      selecting for that reason alone, whatever a paying user asks for.
- [ ] **Offline editing.** Requires the CRDT above. Do not select independently.