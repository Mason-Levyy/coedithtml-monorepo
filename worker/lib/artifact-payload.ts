import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { kindsAtOrBelow, type TokenKind } from "@/lib/room-capabilities";
import type { ResolvedArtifact } from "@/lib/resolve-artifact";
import { artifactUrl, viewerUrl } from "@/lib/share-links";

function shareLinksFor(
  request: Request,
  env: WorkerEnv,
  artifact: ResolvedArtifact,
): Partial<Record<TokenKind, string>> {
  const { record, token } = artifact;
  const { siblingTokens } = record;
  if (siblingTokens === undefined) {
    return { [record.kind]: viewerUrl(request, env, token) };
  }
  return Object.fromEntries(
    kindsAtOrBelow(record.kind).map((kind) => [
      kind,
      viewerUrl(request, env, siblingTokens[kind]),
    ]),
  );
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
    sandboxOrigin: originFor(request, env.SANDBOX_HOST),
    artifactUrl: artifactUrl(request, env, artifact.token, grant),
    shareLinks: shareLinksFor(request, env, artifact),
  };
}
