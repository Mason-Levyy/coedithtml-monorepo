import { SERVER_INFO_META, type JsonRpcId } from "@/lib/schemas/mcp";
import { MODERN_PROTOCOL_VERSION } from "./versions";

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;
export const HEADER_MISMATCH = -32020;
export const UNSUPPORTED_PROTOCOL_VERSION = -32022;

export const SERVER_INFO = {
  name: "coedit",
  title: "Coedit",
  version: "1.0.0",
} as const;

const JSON_HEADERS = { "content-type": "application/json" };

function send(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function rpcResult(
  id: JsonRpcId | undefined,
  result: Record<string, unknown>,
): Response {
  return send(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      result: { ...result, _meta: { [SERVER_INFO_META]: SERVER_INFO } },
    },
    200,
  );
}

export function rpcError(
  id: JsonRpcId | undefined,
  code: number,
  message: string,
  options: { status?: number; data?: Record<string, unknown> } = {},
): Response {
  return send(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code,
        message,
        ...(options.data === undefined ? {} : { data: options.data }),
      },
    },
    options.status ?? 400,
  );
}

export function unsupportedVersion(
  id: JsonRpcId | undefined,
  requested: string,
): Response {
  return rpcError(
    id,
    UNSUPPORTED_PROTOCOL_VERSION,
    "Unsupported protocol version",
    { data: { supported: [MODERN_PROTOCOL_VERSION], requested } },
  );
}

export function methodNotFound(
  id: JsonRpcId | undefined,
  method: string,
): Response {
  return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${method}`, {
    status: 404,
  });
}
