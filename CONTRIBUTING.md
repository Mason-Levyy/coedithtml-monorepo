# Contributing to coeditHTML

Guidelines for contributing to the coeditHTML repository.

## Issues

Open an issue before starting work on major features or design changes. Bug fixes do not require an issue first.

## Setup

Requirements: Node 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

The development server runs at http://app.localhost:8787.

## Checks and CI

Run all checks before submitting a pull request:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter runtime run check-size
```

On Windows, run worker tests with `pnpm test` (invoking `worker/run-tests.mjs`) to handle file locks during test cleanup.

## Core Rules

1. **Do not parse HTML**: Store and serve HTML as received, appending an editor script after `</html>`. Do not build features that require parsing user markup.
2. **Two origins without CORS**: Serve user artifacts from the sandbox origin. App features run on the app origin. Use origin-checked `postMessage` for cross-origin messages.
3. **Runtime isolation and safety**: The injected runtime has zero dependencies, uses one namespace, isolates UI in a shadow root, and fails open so documents render if errors occur.
4. **Bundle size limits**: Keep bundle sizes within limits defined in `runtime/check-bundle-size.mjs`. Put authoring code in `author.js`.
5. **Schema validation**: Use Zod schemas for request bodies, Durable Object messages, and environment bindings. Avoid type assertions (`as`).
6. **Explicit error handling**: Handle errors in async paths without empty catch blocks. Return typed errors to clients and write debug details to logs.
7. **Strict TypeScript**: Keep `strict` mode enabled. Use `unknown` instead of `any`. Avoid `.js` source files.
8. **Code clarity**: Choose clear names and small functions instead of comments. Reserve comments for non-obvious constraints.

## Tests

- Vitest runs tests colocated with source files.
- Test doubles belong in `fakes.ts` files.
- Add test coverage for schema parsing, Durable Object state transitions, and authorization checks.
- Presentational components do not require unit tests.

## Pull Requests

- Keep each pull request focused on one change.
- Describe the motivation for the change and note any affected rules.
