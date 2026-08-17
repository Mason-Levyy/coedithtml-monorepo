import { describe, expect, it } from "vitest";
import {
  budgetIn,
  fullBudget,
  MESSAGE_BURST,
  MESSAGES_PER_SECOND,
  spendMessage,
  type MessageBudget,
} from "@/lib/message-budget";

function flood(
  budget: MessageBudget,
  count: number,
  at = 0,
): { accepted: number; budget: MessageBudget } {
  let held = budget;
  let accepted = 0;
  for (let sent = 0; sent < count; sent += 1) {
    const spend = spendMessage(held, at);
    held = spend.budget;
    if (spend.allowed) {
      accepted += 1;
    }
  }
  return { accepted, budget: held };
}

describe("what one connection may say", () => {
  it("lets a burst through, because a real reader arrives in one", () => {
    expect(flood(fullBudget(0), MESSAGE_BURST).accepted).toBe(MESSAGE_BURST);
  });

  it("stops a connection that keeps going", () => {
    expect(flood(fullBudget(0), MESSAGE_BURST * 10).accepted).toBe(
      MESSAGE_BURST,
    );
  });

  it("gives the budget back over time rather than for good", () => {
    const spent = flood(fullBudget(0), MESSAGE_BURST * 2).budget;

    expect(spendMessage(spent, 0).allowed).toBe(false);
    expect(spendMessage(spent, 1000).allowed).toBe(true);
  });

  it("refills at the rate it says and no faster", () => {
    const spent = flood(fullBudget(0), MESSAGE_BURST).budget;

    expect(flood(spent, MESSAGES_PER_SECOND + 5, 1000).accepted).toBe(
      MESSAGES_PER_SECOND,
    );
  });

  it("never hands out more than one burst, however long the silence", () => {
    const spent = spendMessage(fullBudget(0), 0).budget;

    expect(flood(spent, MESSAGE_BURST + 10, 60 * 60 * 1000).accepted).toBe(
      MESSAGE_BURST,
    );
  });

  it("starts a socket with nothing recorded on a full budget", () => {
    expect(budgetIn(undefined, 0)).toEqual(fullBudget(0));
    expect(budgetIn({ tokens: "lots" }, 0)).toEqual(fullBudget(0));
  });

  it("reads back a budget it wrote, so hibernation is not an amnesty", () => {
    const spent = spendMessage(fullBudget(0), 0).budget;

    expect(budgetIn(spent, 0)).toEqual(spent);
  });
});
