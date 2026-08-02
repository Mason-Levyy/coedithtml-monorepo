import { resolveAccessToken } from "@/lib/access-tokens";
import {
  appendRuntimeScript,
  RUNTIME_SCRIPT_PATH,
} from "@/lib/artifact-render";
import { getArtifact } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { sandboxContentSecurityPolicy } from "@/lib/sandbox-headers";
import { accessTokenSchema } from "@/lib/schemas/artifact";

function sandboxResponse(
  body: BodyInit | null,
  status: number,
  csp: string,
  contentType?: string,
): Response {
  const headers: Record<string, string> = { "content-security-policy": csp };
  if (contentType) {
    headers["content-type"] = contentType;
  }
  return new Response(body, { status, headers });
}

export async function handleSandboxRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const csp = sandboxContentSecurityPolicy(env.APP_HOST);

  if (request.method !== "GET") {
    return sandboxResponse("Method not allowed", 405, csp);
  }

  const { pathname } = new URL(request.url);
  if (pathname === RUNTIME_SCRIPT_PATH) {
    return sandboxResponse("Not found", 404, csp);
  }

  const parsedToken = accessTokenSchema.safeParse(pathname.slice(1));
  if (!parsedToken.success) {
    return sandboxResponse("Not found", 404, csp);
  }

  const resolved = await resolveAccessToken(
    env.ARTIFACT_METADATA,
    parsedToken.data,
  );
  if (!resolved.ok) {
    console.error("Failed to resolve access token", resolved.cause);
    return sandboxResponse("Could not load the file. Try again.", 500, csp);
  }
  if (resolved.record === null) {
    return sandboxResponse("Not found", 404, csp);
  }

  const result = await getArtifact(
    env.ARTIFACT_STORE,
    resolved.record.artifactId,
  );
  if (!result.ok) {
    console.error("Failed to read artifact", result.cause);
    return sandboxResponse("Could not load the file. Try again.", 500, csp);
  }
  if (result.bytes === null) {
    return sandboxResponse("Not found", 404, csp);
  }

  return sandboxResponse(
    appendRuntimeScript(result.bytes),
    200,
    csp,
    "text/html; charset=utf-8",
  );
}
