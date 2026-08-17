import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { siblingsVisibleTo, type TokenKind } from "@/lib/room-capabilities";
import type { ResolvedArtifact } from "@/lib/resolve-artifact";
import { artifactUrl, viewerUrl } from "@/lib/share-links";

function shareLinksFor(
  request: Request,
  env: WorkerEnv,
  artifact: ResolvedArtifact,
): Partial<Record<TokenKind, string>> {
  const { record, token } = artifact;
  const visible = siblingsVisibleTo(record.kind, record.siblingTokens ?? {});
  const links = Object.entries(visible).map(([kind, sibling]) => [
    kind,
    viewerUrl(env, sibling),
  ]);
  return links.length > 0
    ? Object.fromEntries(links)
    : { [record.kind]: viewerUrl(env, token) };
}

export function unlockedArtifactPayload(
  request: Request,
  env: WorkerEnv,
  artifact: ResolvedArtifact,
  grant: string | null,
) {
  const { metadata } = artifact;
  return {
    artifactId: artifact.artifactId,
    fileName: metadata.fileName,
    size: metadata.size,
    uploadedAt: metadata.uploadedAt,
    revision: metadata.revision,
    requiresPassword: false as const,
    sandboxOrigin: originFor(env.SANDBOX_HOST),
    artifactUrl: artifactUrl(env, artifact.token, grant),
    shareLinks: shareLinksFor(request, env, artifact),
  };
}
