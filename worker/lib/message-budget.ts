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
