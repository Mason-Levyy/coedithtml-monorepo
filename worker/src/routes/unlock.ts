import { unlockedArtifactPayload } from "@/lib/artifact-payload";
import type { WorkerEnv } from "@/lib/env";
import { verifyArtifactPassword } from "@/lib/password";
import { chargeAttempt, refundAttempt } from "@/lib/rate-limit";
import { clientIpOf } from "@/lib/request-ip";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError, jsonResponse } from "@/lib/responses";
import { unlockRequestSchema } from "@/lib/schemas/artifact";
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
  const charged = await chargeAttempt(env.RATE_LIMITER, attemptKey, {
    limit: ATTEMPT_LIMIT,
    windowSeconds: ATTEMPT_WINDOW_SECONDS,
  });
  if (!charged.ok) {
    console.error("Failed to charge the password attempt", charged.cause);
    return jsonError(UNAVAILABLE, 500);
  }
  if (!charged.allowed) {
    return jsonError("Too many attempts. Try again later.", 429);
  }

  const valid = await verifyArtifactPassword(
    parsed.data.password,
    metadata.passwordHash,
  );
  if (!valid) {
    return jsonError("Incorrect password.", 401);
  }
  // Charged up front so parallel guesses cannot all pass the same check, and
  // given back here so reading a document five times does not lock you out.
  await refundAttempt(env.RATE_LIMITER, attemptKey);

  const minted = await mintUnlockGrant(env.ARTIFACT_METADATA, artifactId);
  if (!minted.ok) {
    console.error("Failed to mint an unlock grant", minted.cause);
    return jsonError(UNAVAILABLE, 500);
  }

  return jsonResponse(
    unlockedArtifactPayload(request, env, resolved.artifact, minted.grant),
    200,
  );
}
