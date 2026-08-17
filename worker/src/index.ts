import { parseWorkerEnv } from "@/lib/env";
import { classifyRequestOrigin, redirectTargetFor } from "@/lib/origins";
import { handleAppRequest } from "@/routes/app";
import { routeMcp } from "@/routes/mcp";
import { handleSandboxRequest } from "@/routes/sandbox";
import { sweepArtifacts } from "@/sweep";

export { DocRoom } from "@/doc-room";
export { RateLimiter } from "@/rate-limiter";
export { UsageLedger } from "@/usage-ledger";

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
        return (
          routeMcp(request, parsed.env) ?? handleAppRequest(request, parsed.env)
        );
      case "unknown":
        return new Response("Not found", { status: 404 });
    }
  },

  async scheduled(_event, env): Promise<void> {
    const parsed = parseWorkerEnv(env);
    if (!parsed.ok) {
      console.error(
        `Sweep skipped, invalid bindings: ${parsed.invalidBindings.join(", ")}`,
      );
      return;
    }
    const report = await sweepArtifacts(parsed.env);
    console.log(
      `Swept ${report.examined} artifacts: ${report.expired} expired, ${report.warned} warned`,
    );
  },
} satisfies ExportedHandler<Env>;
