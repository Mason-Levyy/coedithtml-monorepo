import type { WorkerEnv } from "@/lib/env";
import { RUNTIME_ASSET_PATH } from "@/lib/artifact-render";

const SPA_DOCUMENT_PATH = "/index.html";
const FILE_EXTENSION = /\.[a-z0-9]+$/i;

async function fetchAsset(env: WorkerEnv, url: URL): Promise<Response | null> {
  try {
    const response = await env.ASSETS.fetch(new Request(url));
    return response.status === 404 ? null : response;
  } catch (cause) {
    console.error("Failed to read an app asset", cause);
    return null;
  }
}

// A missing /assets/*.js must stay a 404: answering it with index.html turns a
// bad build into a blank page that looks like an application bug instead.
function isClientRoute(pathname: string): boolean {
  return !FILE_EXTENSION.test(pathname);
}

export async function serveAppAsset(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === RUNTIME_ASSET_PATH) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await fetchAsset(env, url);
  if (asset) {
    return asset;
  }
  if (!isClientRoute(url.pathname)) {
    return new Response("Not found", { status: 404 });
  }

  const document = await fetchAsset(env, new URL(SPA_DOCUMENT_PATH, url));
  return document ?? new Response("Not found", { status: 404 });
}
