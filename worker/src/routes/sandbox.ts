import {
  appendRuntimeScript,
  RUNTIME_SCRIPT_PATH,
} from "@/lib/artifact-render";
import { getArtifact } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { artifactIdSchema } from "@/lib/schemas/artifact";

export async function handleSandboxRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { pathname } = new URL(request.url);
  if (pathname === RUNTIME_SCRIPT_PATH) {
    return new Response("Not found", { status: 404 });
  }

  const parsedId = artifactIdSchema.safeParse(pathname.slice(1));
  if (!parsedId.success) {
    return new Response("Not found", { status: 404 });
  }

  const result = await getArtifact(env.ARTIFACT_STORE, parsedId.data);
  if (!result.ok) {
    console.error("Failed to read artifact", result.cause);
    return new Response("Could not load the file. Try again.", {
      status: 500,
    });
  }
  if (result.bytes === null) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(appendRuntimeScript(result.bytes), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
