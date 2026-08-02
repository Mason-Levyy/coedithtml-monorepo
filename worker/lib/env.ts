import { z } from "zod";

// Bindings arrive as opaque runtime objects, so there is nothing to parse in
// the usual sense — only their presence and shape can be checked. A binding
// missing from wrangler.jsonc is `undefined` at runtime despite being typed,
// which would otherwise surface as a TypeError on first storage call.
function exposes(value: unknown, methods: readonly string[]): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return methods.every((method) => typeof candidate[method] === "function");
}

const artifactStoreSchema = z.custom<R2Bucket>(
  (value) => exposes(value, ["get", "put", "head", "delete"]),
  { message: "ARTIFACT_STORE is not bound to an R2 bucket" },
);

const artifactMetadataSchema = z.custom<KVNamespace>(
  (value) => exposes(value, ["get", "put", "list", "delete"]),
  { message: "ARTIFACT_METADATA is not bound to a KV namespace" },
);

export const workerEnvSchema = z.object({
  ARTIFACT_STORE: artifactStoreSchema,
  ARTIFACT_METADATA: artifactMetadataSchema,
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export type EnvParseResult =
  { ok: true; env: WorkerEnv } | { ok: false; invalidBindings: string[] };

export function parseWorkerEnv(candidate: unknown): EnvParseResult {
  const result = workerEnvSchema.safeParse(candidate);
  if (result.success) {
    return { ok: true, env: result.data };
  }
  const invalidBindings = result.error.issues.map((issue) =>
    issue.path.join("."),
  );
  return { ok: false, invalidBindings };
}
