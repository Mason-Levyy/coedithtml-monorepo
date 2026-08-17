import { DurableObject } from "cloudflare:workers";

// KV read-then-write is not a rate limit. Twenty parallel uploads all read the
// same count and all pass a limit of twenty, and each colo keeps a counter of
// its own, so the real ceiling was the limit times the number of colos the
// attacker could reach. A Durable Object is one place, and one place is the
// whole point of counting.
//
// One instance per key. The instance is where the atomicity comes from, so
// nothing here needs a lock.
type Window = { count: number; expiresAt: number };

export type RateLimitVerdict = { allowed: boolean; retryAfterSeconds: number };

export class RateLimiter extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/refund") {
      await this.refund();
      return new Response(null, { status: 204 });
    }
    const limit = Number(url.searchParams.get("limit"));
    const windowSeconds = Number(url.searchParams.get("window"));
    if (!Number.isFinite(limit) || !Number.isFinite(windowSeconds)) {
      return new Response("Bad rate limit request", { status: 400 });
    }
    return Response.json(await this.spend(limit, windowSeconds));
  }

  // The password gate charges every attempt and gives the correct one back.
  // Charging only failures needs a check and a spend as separate calls, and a
  // gap between them is how twenty parallel guesses all pass one check.
  private async refund(): Promise<void> {
    const held = await this.ctx.storage.get<Window>("window");
    if (held === undefined || held.count === 0) {
      return;
    }
    await this.ctx.storage.put("window", {
      ...held,
      count: held.count - 1,
    });
  }

  private async spend(
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitVerdict> {
    const now = Date.now();
    const held = await this.ctx.storage.get<Window>("window");
    const window: Window =
      held === undefined || held.expiresAt <= now
        ? { count: 0, expiresAt: now + windowSeconds * 1000 }
        : held;

    if (window.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((window.expiresAt - now) / 1000),
        ),
      };
    }

    const spent: Window = { ...window, count: window.count + 1 };
    await this.ctx.storage.put("window", spent);
    // Storage the room never reclaims is the bug one layer down; the alarm is
    // what makes a counter that saw one request stop costing anything.
    await this.ctx.storage.setAlarm(spent.expiresAt);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  override async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
