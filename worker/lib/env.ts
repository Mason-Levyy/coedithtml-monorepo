import { z } from "zod";
import {
  hostsAreDistinct,
  originConfigShape,
  redirectHostsAreDisjoint,
} from "./origins";

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

const assetsSchema = z.custom<Fetcher>((value) => exposes(value, ["fetch"]), {
  message: "ASSETS is not bound to a static assets directory",
});

const docRoomSchema = z.custom<DurableObjectNamespace>(
  (value) => exposes(value, ["get", "idFromName"]),
  { message: "DOC_ROOM is not bound to a Durable Object namespace" },
);

const rateLimiterSchema = z.custom<DurableObjectNamespace>(
  (value) => exposes(value, ["get", "idFromName"]),
  { message: "RATE_LIMITER is not bound to a Durable Object namespace" },
);

const usageLedgerSchema = z.custom<DurableObjectNamespace>(
  (value) => exposes(value, ["get", "idFromName"]),
  { message: "USAGE_LEDGER is not bound to a Durable Object namespace" },
);

export const workerEnvSchema = z
  .object({
    ARTIFACT_STORE: artifactStoreSchema,
    ARTIFACT_METADATA: artifactMetadataSchema,
    ASSETS: assetsSchema,
    DOC_ROOM: docRoomSchema,
    RATE_LIMITER: rateLimiterSchema,
    USAGE_LEDGER: usageLedgerSchema,
    MCP_ENABLED: z.string().optional(),
    MCP_SIGNING_SECRET: z.string().min(32).optional(),
    ...originConfigShape,
  })
  .refine(hostsAreDistinct, {
    message: "APP_HOST and SANDBOX_HOST must be different hosts",
    path: ["SANDBOX_HOST"],
  })
  .refine(redirectHostsAreDisjoint, {
    message: "REDIRECT_HOSTS must not contain APP_HOST or SANDBOX_HOST",
    path: ["REDIRECT_HOSTS"],
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
