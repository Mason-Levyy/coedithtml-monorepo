import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import type { ResolvedArtifact } from "@/lib/resolve-artifact";
import { artifactUrl } from "@/lib/share-links";

// Both the metadata route and the unlock route answer with this same shape,
// and the app parses it with one schema. Building it in two places is how the
// two drifted apart, so there is one builder.
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
    requiresPassword: false as const,
    sandboxOrigin: originFor(request, env.SANDBOX_HOST),
    artifactUrl: artifactUrl(request, env, artifact.token, grant),
  };
}
