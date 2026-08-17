import type { WorkerEnv } from "@/lib/env";
import { OWNER_COOKIE_NAME } from "@/lib/owner-cookie";
import { handleAppRequest } from "@/routes/app";
import { handleSandboxRequest } from "@/routes/sandbox";

export type Dispatched = { status: number; body: string };

async function dispatched(response: Response): Promise<Dispatched> {
  return { status: response.status, body: await response.text() };
}

export async function callApp(
  env: WorkerEnv,
  options: {
    path: string;
    method: string;
    ownerId?: string;
    body?: BodyInit;
    clientIp: string;
  },
): Promise<Dispatched> {
  const headers = new Headers({ "cf-connecting-ip": options.clientIp });
  if (options.ownerId !== undefined) {
    headers.set("cookie", `${OWNER_COOKIE_NAME}=${options.ownerId}`);
  }
  const request = new Request(`https://${env.APP_HOST}${options.path}`, {
    method: options.method,
    headers,
    ...(options.body === undefined ? {} : { body: options.body }),
  });
  return dispatched(await handleAppRequest(request, env));
}

export async function callSandbox(
  env: WorkerEnv,
  path: string,
): Promise<Dispatched> {
  const request = new Request(`https://${env.SANDBOX_HOST}${path}`);
  return dispatched(await handleSandboxRequest(request, env));
}

export function jsonOf(dispatched: Dispatched): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(dispatched.body);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
