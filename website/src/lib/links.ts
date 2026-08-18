export const SITE_URL = "https://coedithtml.com";

export const APP_URL = "https://app.coedithtml.com";

export const TOUR_URL = `${APP_URL}/tutorial`;

export const MCP_URL = `${APP_URL}/mcp`;

export const CLAUDE_CONNECTORS_URL = "https://claude.ai/customize/connectors";

export const GEMINI_APPS_URL = "https://gemini.google.com/apps";

export const CHATGPT_URL = "https://chatgpt.com/";

export const LOCAL_TOUR_URL = "http://app.localhost:8787/tutorial";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}
