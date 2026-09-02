import {
  getArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { ownerIdFrom } from "@/lib/owner-cookie";
import { jsonError, SAVE_FAILED } from "@/lib/responses";

export type OwnedArtifactResult =
  { ok: true; metadata: ArtifactMetadata } | { ok: false; response: Response };

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
