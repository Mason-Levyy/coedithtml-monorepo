## What changed

<!-- One or two sentences. The diff says how; say what and why. -->

## Which rule this brushes against

<!-- Delete the lines that do not apply. If none do, say "none". -->

- [ ] Touches `runtime/` — the script injected into someone else's document
- [ ] Changes a bundle budget in `runtime/check-bundle-size.mjs` (say why)
- [ ] Touches artifact serving, share tokens, or origin handling in `worker/`
- [ ] Adds or changes a Durable Object message (say how old clients survive it)
- [ ] Adds a dependency (say why the alternative was worse)

## Checks

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build && pnpm test`
- [ ] `pnpm --filter runtime run check-size`
