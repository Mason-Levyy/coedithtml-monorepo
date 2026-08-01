import { parseWorkerEnv } from "@/lib/env";

export default {
  async fetch(_request, env): Promise<Response> {
    const parsed = parseWorkerEnv(env);
    if (!parsed.ok) {
      // Which binding is misconfigured is deployment detail, not something a
      // caller may learn.
      console.error(
        `Worker misconfigured, invalid bindings: ${parsed.invalidBindings.join(", ")}`,
      );
      return new Response("Service unavailable", { status: 503 });
    }

    return new Response("Coedit worker placeholder", { status: 200 });
  },
} satisfies ExportedHandler<Env>;
