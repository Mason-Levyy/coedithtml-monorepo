import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import type { ResolvedArtifact } from "@/lib/resolve-artifact";
import { artifactUrl } from "@/lib/share-links";

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
  };
}
