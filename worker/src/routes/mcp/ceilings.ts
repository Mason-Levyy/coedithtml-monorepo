import type { WorkerEnv } from "@/lib/env";
import { chargeAttempt } from "@/lib/rate-limit";
import { clientIpOf } from "@/lib/request-ip";

export const MCP_MAX_ARTIFACT_BYTES = 1024 * 1024;
export const MCP_UPLOADS_PER_IP = 200;
export const MCP_READS_PER_TOKEN = 120;
const WINDOW_SECONDS = 3600;

const TOO_MANY_UPLOADS =
  "Too many uploads from this connector in the last hour. Try again later.";
const TOO_MANY_READS =
  "This artifact's feedback has been read too many times in the last hour.";

async function charge(
  env: WorkerEnv,
  key: string,
  limit: number,
  refusal: string,
): Promise<string | null> {
  const charged = await chargeAttempt(env.RATE_LIMITER, key, {
    limit,
    windowSeconds: WINDOW_SECONDS,
  });
  if (!charged.ok) {
    console.error("Failed to charge an MCP attempt", charged.cause);
    return "Coedit could not take that just now. Try again.";
  }
  return charged.allowed ? null : refusal;
}

export async function chargeMcpUpload(
  request: Request,
  env: WorkerEnv,
): Promise<string | null> {
  return charge(
    env,
    `mcp-upload-ip:${clientIpOf(request)}`,
    MCP_UPLOADS_PER_IP,
    TOO_MANY_UPLOADS,
  );
}

export async function chargeMcpRead(
  token: string,
  env: WorkerEnv,
): Promise<string | null> {
  return charge(env, `mcp-read:${token}`, MCP_READS_PER_TOKEN, TOO_MANY_READS);
}
