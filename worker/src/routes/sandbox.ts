import {
  appendRuntimeScript,
  revisionInRuntimePath,
  RUNTIME_ASSET_PATH,
} from "@/lib/artifact-render";
import {
  DOWNLOAD_QUERY_PARAM,
  downloadChoiceIn,
} from "@/lib/artifact-download";
import { getArtifact } from "@/lib/artifact-store";
import { handleArtifactDownload } from "@/routes/download";
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

async function serveRuntimeScript(
  request: Request,
  env: WorkerEnv,
  headers: Headers,
  revision: string,
): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(
    new Request(new URL(RUNTIME_ASSET_PATH, request.url)),
  );
  if (!assetResponse.ok) {
    return sandboxResponse("Not found", 404, headers);
  }

  const appOrigin = originFor(request, env.APP_HOST);
  const body = await assetResponse.text();
  const configured = `"use strict";\nwindow.__coedit__=${JSON.stringify({ config: { appOrigin, revision } })};\n${body}`;

  const merged = new Headers(assetResponse.headers);
  for (const [name, value] of headers) {
    merged.set(name, value);
  }
  merged.delete("etag");
  merged.delete("last-modified");
  merged.set("cache-control", "no-cache");
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
  const runtimeRevision = revisionInRuntimePath(url.pathname);
  if (runtimeRevision !== null) {
    return serveRuntimeScript(request, env, headers, runtimeRevision);
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

  const choice = downloadChoiceIn(url.searchParams.get(DOWNLOAD_QUERY_PARAM));
  if (choice !== null) {
    return handleArtifactDownload({
      request,
      env,
      headers,
      artifact: resolved.artifact,
      choice,
    });
  }

  const result = await getArtifact(
    env.ARTIFACT_STORE,
    artifactId,
    metadata.revision,
  );
  if (!result.ok) {
    console.error("Failed to read artifact", result.cause);
    return sandboxResponse(UNAVAILABLE, 500, headers);
  }
  if (result.bytes === null) {
    return sandboxResponse("Not found", 404, headers);
  }

  return sandboxResponse(
    appendRuntimeScript(result.bytes, metadata.revision),
    200,
    headers,
    "text/html; charset=utf-8",
  );
}
