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

const hostListSchema = z.string().transform((value) =>
  value
    .split(",")
    .map(normalizeHost)
    .filter((host) => host.length > 0),
);

export const originConfigShape = {
  APP_HOST: hostSchema,
  SANDBOX_HOST: hostSchema,
  REDIRECT_HOSTS: hostListSchema,
  REDIRECT_TARGET: hostSchema,
};

export type OriginConfig = {
  APP_HOST: string;
  SANDBOX_HOST: string;
  REDIRECT_HOSTS: string[];
  REDIRECT_TARGET: string;
};

export function hostsAreDistinct(config: OriginConfig): boolean {
  return config.APP_HOST !== config.SANDBOX_HOST;
}

// A redirect host is answered with a 301 before anything else looks at it, so
// listing an origin here would bounce that origin's own traffic away.
export function redirectHostsAreDisjoint(config: OriginConfig): boolean {
  return !config.REDIRECT_HOSTS.some(
    (host) => host === config.APP_HOST || host === config.SANDBOX_HOST,
  );
}

export function redirectTargetFor(
  request: Request,
  config: OriginConfig,
): URL | null {
  const url = new URL(request.url);
  if (!config.REDIRECT_HOSTS.includes(normalizeHost(url.host))) {
    return null;
  }
  url.host = config.REDIRECT_TARGET;
  url.protocol = "https:";
  return url;
}

export function originFor(request: Request, host: string): string {
  return `${new URL(request.url).protocol}//${host}`;
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
