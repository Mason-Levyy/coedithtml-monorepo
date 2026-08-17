import { toolNameIn, type JsonRpcMessage } from "@/lib/schemas/mcp";

export function headerMismatchIn(
  request: Request,
  message: JsonRpcMessage,
  declaredVersion: string,
): string | null {
  const version = request.headers.get("mcp-protocol-version");
  if (version !== declaredVersion) {
    return `MCP-Protocol-Version header '${version ?? ""}' does not match the version in _meta`;
  }

  const method = request.headers.get("mcp-method");
  if (method !== message.method) {
    return `Mcp-Method header '${method ?? ""}' does not match body value '${message.method}'`;
  }

  if (message.method !== "tools/call") {
    return null;
  }

  const name = request.headers.get("mcp-name");
  const bodyName = toolNameIn(message);
  if (name !== bodyName) {
    return `Mcp-Name header '${name ?? ""}' does not match body value '${bodyName ?? ""}'`;
  }
  return null;
}
