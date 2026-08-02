import { parseWorkerEnv } from "@/lib/env";
import { classifyRequestOrigin } from "@/lib/origins";

export default {
  async fetch(request, env): Promise<Response> {
    const parsed = parseWorkerEnv(env);
    if (!parsed.ok) {
      console.error(
        `Worker misconfigured, invalid bindings: ${parsed.invalidBindings.join(", ")}`,
      );
      return new Response("Service unavailable", { status: 503 });
    }

    switch (classifyRequestOrigin(request, parsed.env)) {
      case "sandbox":
        return new Response("Artifact sandbox origin", { status: 200 });
      case "app":
        return new Response("Coedit app origin", { status: 200 });
      case "unknown":
        return new Response("Not found", { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
