import type { WorkerEnv } from "@/lib/env";
import { withAppSecurityHeaders } from "@/lib/app-headers";
import { AUTHOR_ASSET_PATH, RUNTIME_ASSET_PATH } from "@/lib/artifact-render";
import { originFor } from "@/lib/origins";
import { TUTORIAL_DECK_ASSET_PATH } from "@/lib/tutorial-deck";

const SPA_DOCUMENT_PATH = "/index.html";

const WITHHELD_FROM_APP_ORIGIN = [
  RUNTIME_ASSET_PATH,
  AUTHOR_ASSET_PATH,
  TUTORIAL_DECK_ASSET_PATH,
];
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

function isClientRoute(pathname: string): boolean {
  return !FILE_EXTENSION.test(pathname);
}

export async function serveAppAsset(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const sandboxOrigin = originFor(env.SANDBOX_HOST);
  const secured = (response: Response): Response =>
    withAppSecurityHeaders(response, sandboxOrigin);

  if (WITHHELD_FROM_APP_ORIGIN.includes(url.pathname)) {
    return secured(new Response("Not found", { status: 404 }));
  }

  const asset = await fetchAsset(env, url);
  if (asset) {
    return secured(asset);
  }
  if (!isClientRoute(url.pathname)) {
    return secured(new Response("Not found", { status: 404 }));
  }

  const document = await fetchAsset(env, new URL(SPA_DOCUMENT_PATH, url));
  return secured(document ?? new Response("Not found", { status: 404 }));
}
