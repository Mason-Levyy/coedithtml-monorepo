export const SITE_URL = "https://coedithtml.com";

export const APP_URL = "https://app.coedithtml.com";

export const TOUR_URL = `${APP_URL}/tutorial`;

export const LOCAL_TOUR_URL = "http://app.localhost:8787/tutorial";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}
