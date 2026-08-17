import { TUTORIAL_QUERY_PARAM } from "@coedithtml/protocol";
import type { WorkerEnv } from "@/lib/env";
import { chargeAttempt } from "@/lib/rate-limit";
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
  const charged = await chargeAttempt(
    env.RATE_LIMITER,
    `tutorial-starts:${clientIpOf(request)}`,
    { limit: TUTORIAL_LIMIT, windowSeconds: TUTORIAL_WINDOW_SECONDS },
  );
  if (!charged.ok) {
    console.error("Failed to charge a tutorial start", charged.cause);
    return plainText(UNAVAILABLE, 503);
  }
  if (!charged.allowed) {
    return plainText(TOO_MANY, 429);
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

  const location = `${viewerUrl(env, session.editToken)}?${TUTORIAL_QUERY_PARAM}=1`;
  return new Response(null, {
    status: 302,
    headers: { ...PRIVATE_HEADERS, location },
  });
}
