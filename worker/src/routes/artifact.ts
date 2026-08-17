import { markdownResponse, wantsMarkdown } from "@/lib/agent-markdown";
import type { WorkerEnv } from "@/lib/env";
import { unlockedArtifactPayload } from "@/lib/artifact-payload";
import { checkPasswordGate } from "@/lib/password-gate";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";
import { UNLOCK_QUERY_PARAM } from "@/lib/share-links";

const UNAVAILABLE = "Could not load the file. Try again.";

function formatArtifactMarkdown(
  payload: ReturnType<typeof unlockedArtifactPayload>,
  tokenKind: string,
): string {
  const links = Object.entries(payload.shareLinks)
    .map(([kind, url]) => `- **${kind.toUpperCase()} URL**: ${url}`)
    .join("\n");
  return [
    `# Artifact: ${payload.fileName}`,
    "",
    `- **Artifact ID**: ${payload.artifactId}`,
    `- **Size**: ${payload.size} bytes`,
    `- **Uploaded**: ${payload.uploadedAt}`,
    `- **Revision**: ${payload.revision}`,
    `- **Access Level**: ${tokenKind}`,
    `- **Artifact URL**: ${payload.artifactUrl}`,
    "",
    "## Share Links",
    links,
  ].join("\n");
}

export async function handleGetArtifact(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const resolved = await resolveArtifactByToken(env.ARTIFACT_METADATA, token);
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error("Failed to resolve the artifact", resolved.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonError("Not found.", 404);
  }

  const { artifactId, metadata } = resolved.artifact;
  const grant = new URL(request.url).searchParams.get(UNLOCK_QUERY_PARAM);
  const gate = await checkPasswordGate(env.ARTIFACT_METADATA, {
    artifactId,
    passwordHash: metadata.passwordHash,
    grant,
  });
  if (!gate.ok) {
    if (gate.status === 500) {
      console.error("Failed to check the password gate", gate.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    if (wantsMarkdown(request)) {
      return markdownResponse(
        `# Artifact Locked\n\nThis artifact requires a password. Submit password to \`/api/artifacts/${token}/unlock\` to access.`,
      );
    }
    return jsonResponse({ requiresPassword: true }, 200);
  }

  const payload = unlockedArtifactPayload(
    request,
    env,
    resolved.artifact,
    grant,
  );
  if (wantsMarkdown(request)) {
    return markdownResponse(
      formatArtifactMarkdown(payload, resolved.artifact.record.kind),
    );
  }

  return jsonResponse(payload, 200);
}
