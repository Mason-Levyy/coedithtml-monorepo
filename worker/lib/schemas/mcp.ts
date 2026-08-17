import { z } from "zod";

export const PROTOCOL_VERSION_META = "io.modelcontextprotocol/protocolVersion";
export const CLIENT_INFO_META = "io.modelcontextprotocol/clientInfo";
export const SERVER_INFO_META = "io.modelcontextprotocol/serverInfo";

export const jsonRpcIdSchema = z.union([z.string(), z.number()]);

export type JsonRpcId = z.infer<typeof jsonRpcIdSchema>;

export const jsonRpcMessageSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: jsonRpcIdSchema.optional(),
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type JsonRpcMessage = z.infer<typeof jsonRpcMessageSchema>;

export const callToolParamsSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

export function protocolVersionIn(message: JsonRpcMessage): string | null {
  const meta = message.params?._meta;
  if (typeof meta !== "object" || meta === null) {
    return null;
  }
  const declared = (meta as Record<string, unknown>)[PROTOCOL_VERSION_META];
  return typeof declared === "string" && declared.length > 0 ? declared : null;
}

export function toolNameIn(message: JsonRpcMessage): string | null {
  const name = message.params?.name;
  return typeof name === "string" && name.length > 0 ? name : null;
}
