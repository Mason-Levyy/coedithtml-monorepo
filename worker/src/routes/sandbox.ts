import {
  appendRuntimeScript,
  RUNTIME_ASSET_PATH,
  RUNTIME_SCRIPT_PATH,
} from "@/lib/artifact-render";
import { getArtifact } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { checkPasswordGate } from "@/lib/password-gate";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { sandboxHeaders } from "@/lib/sandbox-headers";
import { UNLOCK_QUERY_PARAM } from "@/lib/share-links";

const UNAVAILABLE = "Could not load the file. Try again.";

function sandboxResponse(
  body: BodyInit | null,
  status: number,
  headers: Headers,
  contentType?: string,
): Response {
  const merged = new Headers(headers);
  if (contentType) {
    merged.set("content-type", contentType);
  }
  return new Response(body, { status, headers: merged });
}

// Runs before the IIFE in the same script, so the config is already set when the bundle reads it.
async function serveRuntimeScript(
  request: Request,
  env: WorkerEnv,
  headers: Headers,
): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(
    new Request(new URL(RUNTIME_ASSET_PATH, request.url)),
  );
  if (!assetResponse.ok) {
    return sandboxResponse("Not found", 404, headers);
  }

  const appOrigin = originFor(request, env.APP_HOST);
  const body = await assetResponse.text();
  // Own "use strict" first, or prepending anything drops the bundle's own directive and the script runs sloppy-mode.
  const configured = `"use strict";\nwindow.__coedit__=${JSON.stringify({ config: { appOrigin } })};\n${body}`;

  const merged = new Headers(assetResponse.headers);
  for (const [name, value] of headers) {
    merged.set(name, value);
  }
  return new Response(configured, { status: 200, headers: merged });
}

export async function handleSandboxRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const headers = sandboxHeaders(env.APP_HOST);

  if (request.method !== "GET") {
    return sandboxResponse("Method not allowed", 405, headers);
  }

  const url = new URL(request.url);
  if (url.pathname === RUNTIME_SCRIPT_PATH) {
    return serveRuntimeScript(request, env, headers);
  }

  const resolved = await resolveArtifactByToken(
    env.ARTIFACT_METADATA,
    url.pathname.slice(1),
  );
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error("Failed to resolve the artifact", resolved.cause);
      return sandboxResponse(UNAVAILABLE, 500, headers);
    }
    return sandboxResponse("Not found", 404, headers);
  }

  const { artifactId, metadata } = resolved.artifact;
  const gate = await checkPasswordGate(env.ARTIFACT_METADATA, {
    artifactId,
    passwordHash: metadata.passwordHash,
    grant: url.searchParams.get(UNLOCK_QUERY_PARAM),
  });
  if (!gate.ok) {
    if (gate.status === 500) {
      console.error("Failed to check the password gate", gate.cause);
      return sandboxResponse(UNAVAILABLE, 500, headers);
    }
    return sandboxResponse("This link needs a password.", 401, headers);
  }

  const result = await getArtifact(env.ARTIFACT_STORE, artifactId);
  if (!result.ok) {
    console.error("Failed to read artifact", result.cause);
    return sandboxResponse(UNAVAILABLE, 500, headers);
  }
  if (result.bytes === null) {
    return sandboxResponse("Not found", 404, headers);
  }

  return sandboxResponse(
    appendRuntimeScript(result.bytes),
    200,
    headers,
    "text/html; charset=utf-8",
  );
}
