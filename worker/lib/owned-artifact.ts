import {
  getArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { ownerIdFrom } from "@/lib/owner-cookie";
import { jsonError, SAVE_FAILED } from "@/lib/responses";

export type OwnedArtifactResult =
  { ok: true; metadata: ArtifactMetadata } | { ok: false; response: Response };

// An artifact with no recorded owner has no owner, and nobody may manage it.
// The permissive reading -- no owner means anyone -- handed every artifact
// uploaded before the owner cookie existed to any reader of any link,
// including a view-only one, since the viewer payload carries the artifact id.
// That was delete, password change, and link revocation for strangers.
//
// Failing closed costs those artifacts nothing that worked: their owner never
// had a cookie to prove anything with either. Their links keep serving, and
// v0.6's sweep is what eventually collects them.
export function ownsArtifact(
  metadata: ArtifactMetadata,
  request: Request,
): boolean {
  const owner = metadata.ownerId;
  if (owner === undefined || owner.length === 0) {
    return false;
  }
  return owner === ownerIdFrom(request);
}

export async function requireOwnedArtifact(
  kv: KVNamespace,
  artifactId: string,
  request: Request,
  forbiddenMessage: string,
): Promise<OwnedArtifactResult> {
  const result = await getArtifactMetadata(kv, artifactId);
  if (!result.ok) {
    console.error("Failed to get artifact metadata", result.cause);
    return { ok: false, response: jsonError(SAVE_FAILED, 500) };
  }
  if (result.metadata === null) {
    return { ok: false, response: jsonError("Not found.", 404) };
  }

  const metadata = result.metadata;
  if (!ownsArtifact(metadata, request)) {
    return { ok: false, response: jsonError(forbiddenMessage, 403) };
  }

  return { ok: true, metadata };
}
