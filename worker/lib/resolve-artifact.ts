import { resolveAccessToken, type TokenRecord } from "@/lib/access-tokens";
import {
  getArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { accessTokenSchema } from "@/lib/schemas/artifact";

export type ResolvedArtifact = {
  artifactId: string;
  token: string;
  record: TokenRecord;
  metadata: ArtifactMetadata;
};

export type ResolveArtifactResult =
  | { ok: true; artifact: ResolvedArtifact }
  | { ok: false; status: 404 }
  | { ok: false; status: 500; cause: unknown };

export async function resolveArtifactByToken(
  kv: KVNamespace,
  token: string,
): Promise<ResolveArtifactResult> {
  const parsedToken = accessTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return { ok: false, status: 404 };
  }

  const resolved = await resolveAccessToken(kv, parsedToken.data);
  if (!resolved.ok) {
    return { ok: false, status: 500, cause: resolved.cause };
  }
  if (resolved.record === null) {
    return { ok: false, status: 404 };
  }

  const lookup = await getArtifactMetadata(kv, resolved.record.artifactId);
  if (!lookup.ok) {
    return { ok: false, status: 500, cause: lookup.cause };
  }
  if (lookup.metadata === null) {
    return { ok: false, status: 404 };
  }

  return {
    ok: true,
    artifact: {
      artifactId: resolved.record.artifactId,
      token: parsedToken.data,
      record: resolved.record,
      metadata: lookup.metadata,
    },
  };
}
