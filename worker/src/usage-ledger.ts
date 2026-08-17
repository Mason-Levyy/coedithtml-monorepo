import { DurableObject } from "cloudflare:workers";

// Bytes and artifacts held, counted somewhere they cannot be double-counted.
// The same read-then-write that breaks a rate limiter breaks a running total,
// and here the failure mode is a ceiling that quietly is not one.
//
// One instance for the whole product, one per owner. They are the same
// question -- how much is being stored, and on whose behalf -- asked at two
// scopes, so they are the same object under two names.
export type Usage = { bytes: number; artifacts: number };

export type UsageVerdict = { allowed: boolean; usage: Usage };

const EMPTY: Usage = { bytes: 0, artifacts: 0 };

export class UsageLedger extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/read") {
      return Response.json(await this.read());
    }
    if (url.pathname === "/release") {
      return Response.json(
        await this.release(Number(url.searchParams.get("bytes"))),
      );
    }
    if (url.pathname === "/hold") {
      return Response.json(
        await this.hold(
          Number(url.searchParams.get("bytes")),
          Number(url.searchParams.get("maxBytes")),
          Number(url.searchParams.get("maxArtifacts")),
        ),
      );
    }
    return new Response("Unknown ledger operation", { status: 404 });
  }

  private async read(): Promise<Usage> {
    return (await this.ctx.storage.get<Usage>("usage")) ?? EMPTY;
  }

  private async hold(
    bytes: number,
    maxBytes: number,
    maxArtifacts: number,
  ): Promise<UsageVerdict> {
    const usage = await this.read();
    if (!Number.isFinite(bytes) || bytes < 0) {
      return { allowed: false, usage };
    }
    const next: Usage = {
      bytes: usage.bytes + bytes,
      artifacts: usage.artifacts + 1,
    };
    if (next.bytes > maxBytes || next.artifacts > maxArtifacts) {
      return { allowed: false, usage };
    }
    await this.ctx.storage.put("usage", next);
    return { allowed: true, usage: next };
  }

  private async release(bytes: number): Promise<Usage> {
    const usage = await this.read();
    const next: Usage = {
      bytes: Math.max(0, usage.bytes - (Number.isFinite(bytes) ? bytes : 0)),
      artifacts: Math.max(0, usage.artifacts - 1),
    };
    await this.ctx.storage.put("usage", next);
    return next;
  }
}
