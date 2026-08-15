import { TUTORIAL_QUERY_PARAM } from "@coedithtml/protocol";
import type { WorkerEnv } from "@/lib/env";
import { isWithinRateLimit, recordRateLimitedAttempt } from "@/lib/rate-limit";
import { clientIpOf } from "@/lib/request-ip";
import { viewerUrl } from "@/lib/share-links";
import { startTutorialSession } from "@/lib/tutorial-session";

const TUTORIAL_LIMIT = 12;
const TUTORIAL_WINDOW_SECONDS = 3600;

const UNAVAILABLE = "The tutorial is not available right now. Try again.";
const TOO_MANY =
  "You have started the tutorial several times already. Try again later.";

const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex",
};

function plainText(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      ...PRIVATE_HEADERS,
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

async function chargeTutorialStart(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const key = `tutorial-starts:${clientIpOf(request)}`;
  const rateLimit = await isWithinRateLimit(
    env.ARTIFACT_METADATA,
    key,
    TUTORIAL_LIMIT,
  );
  if (!rateLimit.ok) {
    console.error("Failed to check the tutorial rate limit", rateLimit.cause);
    return plainText(UNAVAILABLE, 503);
  }
  if (!rateLimit.allowed) {
    return plainText(TOO_MANY, 429);
  }

  const recorded = await recordRateLimitedAttempt(
    env.ARTIFACT_METADATA,
    key,
    TUTORIAL_WINDOW_SECONDS,
  );
  if (!recorded.ok) {
    console.error("Failed to record a tutorial start", recorded.cause);
    return plainText(UNAVAILABLE, 503);
  }
  return null;
}

export async function handleStartTutorial(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const overLimit = await chargeTutorialStart(request, env);
  if (overLimit) {
    return overLimit;
  }

  const session = await startTutorialSession(request, env);
  if (!session.ok) {
    return plainText(UNAVAILABLE, 503);
  }

  const location = `${viewerUrl(request, env, session.editToken)}?${TUTORIAL_QUERY_PARAM}=1`;
  return new Response(null, {
    status: 302,
    headers: { ...PRIVATE_HEADERS, location },
  });
}
