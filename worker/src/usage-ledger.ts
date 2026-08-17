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

// Whether the caller has to write the bytes, or whether this owner already had
// them. Refcounting is not KV's job -- the same non-atomic read-then-write that
// broke the rate limiter breaks a refcount, and here the failure mode is
// deleting bytes somebody is still reading.
export type AttachVerdict = { allowed: boolean; store: boolean };

export type DetachVerdict = { lastReference: boolean };

type BlobRefs = { bytes: number; artifacts: string[] };

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
    if (url.pathname === "/attach") {
      return Response.json(
        await this.attach({
          digest: url.searchParams.get("digest") ?? "",
          artifactId: url.searchParams.get("artifact") ?? "",
          bytes: Number(url.searchParams.get("bytes")),
          maxBytes: Number(url.searchParams.get("maxBytes")),
          maxArtifacts: Number(url.searchParams.get("maxArtifacts")),
        }),
      );
    }
    if (url.pathname === "/detach") {
      return Response.json(
        await this.detach(
          url.searchParams.get("digest") ?? "",
          url.searchParams.get("artifact") ?? "",
        ),
      );
    }
    return new Response("Unknown ledger operation", { status: 404 });
  }

  private refsKey(digest: string): string {
    return `blob:${digest}`;
  }

  // Charging and referencing are one transaction because they are one fact:
  // this owner now holds these bytes, whether or not they had to be written.
  private async attach(options: {
    digest: string;
    artifactId: string;
    bytes: number;
    maxBytes: number;
    maxArtifacts: number;
  }): Promise<AttachVerdict> {
    const { digest, artifactId, bytes, maxBytes, maxArtifacts } = options;
    if (digest.length === 0 || artifactId.length === 0) {
      return { allowed: false, store: false };
    }
    const key = this.refsKey(digest);
    const held = await this.ctx.storage.get<BlobRefs>(key);
    const usage = await this.read();
    // Bytes already here cost nothing to keep, which is the entire point.
    const charge = held === undefined ? bytes : 0;
    const next: Usage = {
      bytes: usage.bytes + charge,
      artifacts: usage.artifacts + 1,
    };
    if (next.bytes > maxBytes || next.artifacts > maxArtifacts) {
      return { allowed: false, store: false };
    }

    const refs: BlobRefs = held ?? { bytes, artifacts: [] };
    if (!refs.artifacts.includes(artifactId)) {
      refs.artifacts.push(artifactId);
    }
    await this.ctx.storage.put(key, refs);
    await this.ctx.storage.put("usage", next);
    return { allowed: true, store: held === undefined };
  }

  private async detach(
    digest: string,
    artifactId: string,
  ): Promise<DetachVerdict> {
    const key = this.refsKey(digest);
    const held = await this.ctx.storage.get<BlobRefs>(key);
    if (held === undefined) {
      return { lastReference: false };
    }
    const remaining = held.artifacts.filter((held) => held !== artifactId);
    const usage = await this.read();
    if (remaining.length > 0) {
      await this.ctx.storage.put(key, { ...held, artifacts: remaining });
      await this.ctx.storage.put("usage", {
        bytes: usage.bytes,
        artifacts: Math.max(0, usage.artifacts - 1),
      });
      return { lastReference: false };
    }
    await this.ctx.storage.delete(key);
    await this.ctx.storage.put("usage", {
      bytes: Math.max(0, usage.bytes - held.bytes),
      artifacts: Math.max(0, usage.artifacts - 1),
    });
    return { lastReference: true };
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
