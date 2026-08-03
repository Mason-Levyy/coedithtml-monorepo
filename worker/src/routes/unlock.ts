import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { verifyArtifactPassword } from "@/lib/password";
import { isWithinRateLimit, recordRateLimitedAttempt } from "@/lib/rate-limit";
import { clientIpOf } from "@/lib/request-ip";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";
import { unlockRequestSchema } from "@/lib/schemas/artifact";
import { artifactUrl } from "@/lib/share-links";
import { mintUnlockGrant } from "@/lib/unlock-grants";

const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_SECONDS = 600;
const UNAVAILABLE = "Could not load the file. Try again.";

export async function handleUnlockArtifact(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = unlockRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Enter the password for this link.", 400);
  }

  const resolved = await resolveArtifactByToken(env.ARTIFACT_METADATA, token);
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error("Failed to resolve the artifact", resolved.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonError("Not found.", 404);
  }

  const { artifactId, metadata } = resolved.artifact;
  if (metadata.passwordHash === undefined) {
    return jsonError("This link does not have a password.", 400);
  }

  const attemptKey = `password-attempts:${artifactId}:${clientIpOf(request)}`;
  const rateLimit = await isWithinRateLimit(
    env.ARTIFACT_METADATA,
    attemptKey,
    ATTEMPT_LIMIT,
  );
  if (!rateLimit.ok) {
    console.error("Failed to check the password rate limit", rateLimit.cause);
    return jsonError(UNAVAILABLE, 500);
  }
  if (!rateLimit.allowed) {
    return jsonError("Too many attempts. Try again later.", 429);
  }

  const valid = await verifyArtifactPassword(
    parsed.data.password,
    metadata.passwordHash,
  );
  if (!valid) {
    const recorded = await recordRateLimitedAttempt(
      env.ARTIFACT_METADATA,
      attemptKey,
      ATTEMPT_WINDOW_SECONDS,
    );
    if (!recorded.ok) {
      console.error("Failed to record the password attempt", recorded.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonError("Incorrect password.", 401);
  }

  const minted = await mintUnlockGrant(env.ARTIFACT_METADATA, artifactId);
  if (!minted.ok) {
    console.error("Failed to mint an unlock grant", minted.cause);
    return jsonError(UNAVAILABLE, 500);
  }

  return jsonResponse(
    {
      artifactId,
      fileName: metadata.fileName,
      size: metadata.size,
      uploadedAt: metadata.uploadedAt,
      requiresPassword: false,
      sandboxOrigin: originFor(request, env.SANDBOX_HOST),
      artifactUrl: artifactUrl(
        request,
        env,
        resolved.artifact.token,
        minted.grant,
      ),
    },
    200,
  );
}
