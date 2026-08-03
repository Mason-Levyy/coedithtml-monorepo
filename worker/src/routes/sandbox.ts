import { resolveAccessToken } from "@/lib/access-tokens";
import {
  appendRuntimeScript,
  RUNTIME_SCRIPT_PATH,
} from "@/lib/artifact-render";
import { getArtifactMetadata } from "@/lib/artifact-metadata";
import { getArtifact } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { checkPasswordGate } from "@/lib/password-gate";
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

// Runs before the IIFE in the same script, so __coedit_config__ is already set when it reads it.
async function serveRuntimeScript(
  request: Request,
  env: WorkerEnv,
  csp: string,
): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(
    new Request(new URL("/runtime.js", request.url)),
  );
  if (!assetResponse.ok) {
    return sandboxResponse("Not found", 404, csp);
  }

  const appOrigin = originFor(request, env.APP_HOST);
  const body = await assetResponse.text();
  // Own "use strict" first, or prepending anything drops the bundle's own directive and the script runs sloppy-mode.
  const configured = `"use strict";\nwindow.__coedit_config__=${JSON.stringify({ appOrigin })};\n${body}`;

  const headers = new Headers(assetResponse.headers);
  headers.set("content-security-policy", csp);
  return new Response(configured, { status: 200, headers });
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
    return serveRuntimeScript(request, env, csp);
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
  const { artifactId } = resolved.record;

  const metadataLookup = await getArtifactMetadata(
    env.ARTIFACT_METADATA,
    artifactId,
  );
  if (!metadataLookup.ok) {
    console.error("Failed to read artifact metadata", metadataLookup.cause);
    return sandboxResponse("Could not load the file. Try again.", 500, csp);
  }
  if (metadataLookup.metadata === null) {
    return sandboxResponse("Not found", 404, csp);
  }

  const gate = await checkPasswordGate(env.ARTIFACT_METADATA, {
    artifactId,
    request,
    passwordHash: metadataLookup.metadata.passwordHash,
    providedPassword: new URL(request.url).searchParams.get("password"),
  });
  if (!gate.ok) {
    if (gate.status === 500) {
      console.error("Failed to check the password gate", gate.cause);
      return sandboxResponse("Could not load the file. Try again.", 500, csp);
    }
    return sandboxResponse(gate.message, gate.status, csp);
  }

  const result = await getArtifact(env.ARTIFACT_STORE, artifactId);
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
