import { z } from "zod";

const hostSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
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
  // URL parsing normalizes the host to lowercase and keeps the port, so a
  // request to app.example.com:9999 cannot pass as app.example.com.
  const { host } = new URL(request.url);

  // Sandbox is matched first so that any future config bug collapsing the two
  // hosts resolves to the origin holding no credentials.
  if (host === config.SANDBOX_HOST) {
    return "sandbox";
  }
  if (host === config.APP_HOST) {
    return "app";
  }
  return "unknown";
}
