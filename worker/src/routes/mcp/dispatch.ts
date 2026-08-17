import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { handleAppRequest } from "@/routes/app";
import { handleSandboxRequest } from "@/routes/sandbox";

export type Dispatched = { status: number; body: string };

async function dispatched(response: Response): Promise<Dispatched> {
  return { status: response.status, body: await response.text() };
}

export async function readFromApp(
  env: WorkerEnv,
  path: string,
): Promise<Dispatched> {
  return dispatched(
    await handleAppRequest(
      new Request(`${originFor(env.APP_HOST)}${path}`),
      env,
    ),
  );
}

export async function readFromSandbox(
  env: WorkerEnv,
  path: string,
): Promise<Dispatched> {
  return dispatched(
    await handleSandboxRequest(
      new Request(`${originFor(env.SANDBOX_HOST)}${path}`),
      env,
    ),
  );
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
