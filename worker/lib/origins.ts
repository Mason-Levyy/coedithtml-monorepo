import { z } from "zod";

// Strips the trailing root-label dot: `example.com.` reaches the same server
// and carries the same cookies as `example.com`, so leaving it in lets one
// host read as two distinct origins and defeats hostsAreDistinct.
function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.(?=:|$)/, "");
}

const hostSchema = z
  .string()
  .transform(normalizeHost)
  .refine((value) => value.length > 0, { message: "host must not be empty" })
  .refine((value) => !value.includes("://") && !value.includes("/"), {
    message: "host must be a bare host[:port], not a URL",
  });

export const originConfigShape = {
  APP_HOST: hostSchema,
  SANDBOX_HOST: hostSchema,
};

export type OriginConfig = {
  APP_HOST: string;
  SANDBOX_HOST: string;
};

export function hostsAreDistinct(config: OriginConfig): boolean {
  return config.APP_HOST !== config.SANDBOX_HOST;
}

export type RequestOrigin = "app" | "sandbox" | "unknown";

export function classifyRequestOrigin(
  request: Request,
  config: OriginConfig,
): RequestOrigin {
  const host = normalizeHost(new URL(request.url).host);

  if (host === config.SANDBOX_HOST) {
    return "sandbox";
  }
  if (host === config.APP_HOST) {
    return "app";
  }
  return "unknown";
}
