import type { WorkerEnv } from "@/lib/env";
import {
  callToolParamsSchema,
  jsonRpcMessageSchema,
  protocolVersionIn,
  type JsonRpcMessage,
} from "@/lib/schemas/mcp";
import { headerMismatchIn } from "./headers";
import {
  HEADER_MISMATCH,
  INTERNAL_ERROR,
  INVALID_PARAMS,
  INVALID_REQUEST,
  PARSE_ERROR,
  SERVER_INFO,
  methodNotFound,
  rpcError,
  rpcResult,
  unsupportedVersion,
} from "./jsonrpc";
import { toolListing, toolNamed } from "./tools/index";
import {
  MODERN_PROTOCOL_VERSION,
  isModernVersion,
  legacyVersionFor,
} from "./versions";

const LIST_TTL_MS = 3_600_000;
const CAPABILITIES = { tools: { listChanged: false } };

async function readMessage(
  request: Request,
): Promise<
  { ok: true; message: JsonRpcMessage } | { ok: false; response: Response }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: rpcError(undefined, PARSE_ERROR, "Invalid JSON"),
    };
  }
  const parsed = jsonRpcMessageSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: rpcError(undefined, INVALID_REQUEST, "Not a JSON-RPC request"),
    };
  }
  return { ok: true, message: parsed.data };
}

async function callTool(
  message: JsonRpcMessage,
  request: Request,
  env: WorkerEnv,
): Promise<Record<string, unknown> | Response> {
  const params = callToolParamsSchema.safeParse(message.params ?? {});
  if (!params.success) {
    return rpcError(message.id, INVALID_PARAMS, "A tool name is required");
  }
  const tool = toolNamed(params.data.name);
  if (tool === null) {
    return rpcError(
      message.id,
      INVALID_PARAMS,
      `Unknown tool: ${params.data.name}`,
    );
  }
  try {
    return { ...(await tool.run(params.data.arguments, { request, env })) };
  } catch (cause) {
    console.error("An MCP tool threw", cause);
    return rpcError(message.id, INTERNAL_ERROR, "The tool failed. Try again.");
  }
}

function discoverResult(): Record<string, unknown> {
  return {
    protocolVersions: [MODERN_PROTOCOL_VERSION],
    capabilities: CAPABILITIES,
    serverInfo: SERVER_INFO,
  };
}

async function dispatchMethod(
  message: JsonRpcMessage,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const complete = (result: Record<string, unknown>): Response =>
    rpcResult(message.id, { ...result, resultType: "complete" });

  if (message.method === "server/discover") {
    return complete(discoverResult());
  }
  if (message.method === "tools/list") {
    return complete({
      tools: toolListing(),
      ttlMs: LIST_TTL_MS,
      cacheScope: "public",
    });
  }
  if (message.method === "tools/call") {
    const called = await callTool(message, request, env);
    return called instanceof Response ? called : complete(called);
  }
  return methodNotFound(message.id, message.method);
}

async function handleLegacy(
  message: JsonRpcMessage,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (message.method === "initialize") {
    return rpcResult(message.id, {
      protocolVersion: legacyVersionFor(message.params?.protocolVersion),
      capabilities: CAPABILITIES,
      serverInfo: SERVER_INFO,
    });
  }
  if (message.method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }
  if (message.method === "ping") {
    return rpcResult(message.id, {});
  }
  if (message.method === "tools/list") {
    return rpcResult(message.id, { tools: toolListing() });
  }
  if (message.method === "tools/call") {
    const called = await callTool(message, request, env);
    return called instanceof Response ? called : rpcResult(message.id, called);
  }
  return methodNotFound(message.id, message.method);
}

export const MCP_PATH = "/mcp";

export function mcpEnabled(env: WorkerEnv): boolean {
  return env.MCP_ENABLED === "true";
}

export function routeMcp(
  request: Request,
  env: WorkerEnv,
): Promise<Response> | null {
  if (new URL(request.url).pathname !== MCP_PATH) {
    return null;
  }
  return mcpEnabled(env)
    ? handleMcpRequest(request, env)
    : Promise.resolve(new Response("Not found", { status: 404 }));
}

export async function handleMcpRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const read = await readMessage(request);
  if (!read.ok) {
    return read.response;
  }
  const message = read.message;

  const declaredVersion = protocolVersionIn(message);
  if (declaredVersion === null) {
    return handleLegacy(message, request, env);
  }
  if (!isModernVersion(declaredVersion)) {
    return unsupportedVersion(message.id, declaredVersion);
  }

  const mismatch = headerMismatchIn(request, message, declaredVersion);
  if (mismatch !== null) {
    return rpcError(message.id, HEADER_MISMATCH, mismatch);
  }

  return dispatchMethod(message, request, env);
}
