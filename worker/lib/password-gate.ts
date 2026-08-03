import { verifyArtifactPassword } from "./password";
import { isWithinRateLimit, recordRateLimitedAttempt } from "./rate-limit";
import { clientIpOf } from "./request-ip";

const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_SECONDS = 600;

export type PasswordGateResult =
  | { ok: true }
  | {
      ok: false;
      status: 401;
      message: "Password required." | "Incorrect password.";
    }
  | { ok: false; status: 429; message: "Too many attempts. Try again later." }
  | { ok: false; status: 500; cause: unknown };

export async function checkPasswordGate(
  kv: KVNamespace,
  options: {
    artifactId: string;
    request: Request;
    passwordHash: string | undefined;
    providedPassword: string | null;
  },
): Promise<PasswordGateResult> {
  const { artifactId, request, passwordHash, providedPassword } = options;
  if (passwordHash === undefined) {
    return { ok: true };
  }

  const attemptKey = `password-attempts:${artifactId}:${clientIpOf(request)}`;
  const rateLimit = await isWithinRateLimit(kv, attemptKey, ATTEMPT_LIMIT);
  if (!rateLimit.ok) {
    return { ok: false, status: 500, cause: rateLimit.cause };
  }
  if (!rateLimit.allowed) {
    return {
      ok: false,
      status: 429,
      message: "Too many attempts. Try again later.",
    };
  }

  if (providedPassword === null) {
    return { ok: false, status: 401, message: "Password required." };
  }

  if (
    !(await verifyArtifactPassword(artifactId, providedPassword, passwordHash))
  ) {
    const recorded = await recordRateLimitedAttempt(
      kv,
      attemptKey,
      ATTEMPT_WINDOW_SECONDS,
    );
    if (!recorded.ok) {
      return { ok: false, status: 500, cause: recorded.cause };
    }
    return { ok: false, status: 401, message: "Incorrect password." };
  }

  return { ok: true };
}
