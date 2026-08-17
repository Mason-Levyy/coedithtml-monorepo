// Every accepted message fans out to as many as 64 sockets, and nothing
// counted them. `hello` is answered before the write check, so the least
// privileged connection in the room -- a view-only link -- was the cheapest
// way to make the room shout at everyone.
//
// A token bucket per socket: a burst is fine, a stream is not. It rides in the
// socket's own attachment rather than a map on the instance, so hibernation
// cannot hand a flooder a fresh budget by forgetting about them.
export const MESSAGE_BURST = 40;
export const MESSAGES_PER_SECOND = 10;

export type MessageBudget = { tokens: number; refilledAt: number };

export function fullBudget(now: number): MessageBudget {
  return { tokens: MESSAGE_BURST, refilledAt: now };
}

export function budgetIn(value: unknown, now: number): MessageBudget {
  if (typeof value !== "object" || value === null) {
    return fullBudget(now);
  }
  const record = value as Record<string, unknown>;
  const tokens = record.tokens;
  const refilledAt = record.refilledAt;
  if (typeof tokens !== "number" || typeof refilledAt !== "number") {
    return fullBudget(now);
  }
  return { tokens, refilledAt };
}

export function spendMessage(
  budget: MessageBudget,
  now: number,
): { allowed: boolean; budget: MessageBudget } {
  const elapsedSeconds = Math.max(0, now - budget.refilledAt) / 1000;
  const refilled = Math.min(
    MESSAGE_BURST,
    budget.tokens + elapsedSeconds * MESSAGES_PER_SECOND,
  );
  if (refilled < 1) {
    return { allowed: false, budget: { tokens: refilled, refilledAt: now } };
  }
  return { allowed: true, budget: { tokens: refilled - 1, refilledAt: now } };
}
