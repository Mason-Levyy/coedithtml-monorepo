---
name: add-do-message
description: Add a new websocket message type to a Coedit Durable Object (or handle one on the runtime client side) without breaking clients already connected on the old message set. Use whenever asked to add, extend, or change the DO <-> runtime websocket protocol.
---

Durable Objects in `worker/` hold per-document state and fan out changes over websockets to every connected client — including the injected `runtime/` editor script, which per CLAUDE.md must **fail open**: if it receives something it doesn't understand, it must not crash or stop the artifact from rendering. A new message type has to respect clients on both sides of a rolling deploy — old DOs talking to new runtimes, new DOs talking to old runtimes — not just the version you're writing today.

## 1. Define the message schema

Message types are a Zod discriminated union keyed by a `type` field, in `worker/lib/` alongside the other schemas (create `worker/lib/schemas/do-messages.ts` if it doesn't exist yet). Add your message as a new member of the union — never repurpose an existing `type` value or change what an existing field means; that breaks anyone still holding the old contract.

```ts
const baseMessage = z.object({ type: z.string() });
const cursorMoveMessage = baseMessage.extend({
  type: z.literal('cursor-move'),
  sectionId: z.string(),
  position: z.number(),
});
// new message = new union member, added here
export const doMessageSchema = z.discriminatedUnion('type', [
  cursorMoveMessage,
  // ...
]);
```

New fields on an existing message must be optional with a sensible fallback — never newly-required — since an old client won't send them.

## 2. Handle it in the Durable Object

Validate every inbound message against the schema before touching state (`worker/` — DO message handling is exactly where CLAUDE.md requires Zod validation). An unrecognized `type` (from an older or newer client than the DO expects) must be ignored/logged, not thrown — a `switch` with a safe default, not a bare `parse()` that throws on an unfamiliar variant.

Authorize before applying: confirm the sender's connection is scoped to this document/section the same way an HTTP route would check token scope — a message type is a mutation path, not exempt from the authorization rules in `worker/lib/`.

## 3. Handle it on the runtime client

The matching branch lives in `runtime/src/`'s transport module (transport stays in its own module, per CLAUDE.md's runtime file layout — don't scatter websocket handling into the DOM/section-resolution modules). An unrecognized message `type` from the server must be a no-op, not a throw: the runtime's fail-open rule applies to the wire protocol specifically, since a DO ahead of an un-refreshed runtime is a normal, expected state during any deploy.

## 4. Test the state transition, not just the schema

Per CLAUDE.md's required coverage, a new DO message type needs a test on the Durable Object's state transitions — not only "valid message accepted, invalid message rejected," but the concurrent-edit and reconnect scenarios that are the actual point of testing a DO:

- Two clients send the new message type concurrently — does the resulting state match what both clients see after fanout?
- A client reconnects after missing this message — does it end up in the same state as clients that were connected the whole time, or does it need this message type reflected in whatever reconnect/resync payload the DO sends?
- An old client (simulate by only sending pre-existing message types) is unaffected by the new type existing — nothing breaks for connections that never send or expect it.

Use the colocated `fakes.ts` test doubles rather than a real websocket/DO instance, and put the test file next to the DO source it exercises.
