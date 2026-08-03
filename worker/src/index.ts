import { parseWorkerEnv } from "@/lib/env";
import { classifyRequestOrigin, redirectTargetFor } from "@/lib/origins";
import { handleAppRequest } from "@/routes/app";
import { handleSandboxRequest } from "@/routes/sandbox";

export default {
  async fetch(request, env): Promise<Response> {
    const parsed = parseWorkerEnv(env);
    if (!parsed.ok) {
      console.error(
        `Worker misconfigured, invalid bindings: ${parsed.invalidBindings.join(", ")}`,
      );
      return new Response("Service unavailable", { status: 503 });
    }

    const redirect = redirectTargetFor(request, parsed.env);
    if (redirect) {
      return Response.redirect(redirect.toString(), 301);
    }

    switch (classifyRequestOrigin(request, parsed.env)) {
      case "sandbox":
        return handleSandboxRequest(request, parsed.env);
      case "app":
        return handleAppRequest(request, parsed.env);
      case "unknown":
        return new Response("Not found", { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
