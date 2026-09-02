import { ownerIdSchema } from "./schemas/artifact";
import { newOwnerId } from "./storage-keys";

export const OWNER_COOKIE_NAME = "__Host-coedit_owner";
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isValidOwnerId(id: string): boolean {
  return ownerIdSchema.safeParse(id).success;
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    cookies[key] = val;
  }
  return cookies;
}

export function ownerIdFrom(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const candidate = cookies[OWNER_COOKIE_NAME];
  if (candidate && isValidOwnerId(candidate)) {
    return candidate;
  }
  return null;
}

export function resolveOwnerId(request: Request): {
  ownerId: string;
  isNew: boolean;
} {
  const existing = ownerIdFrom(request);
  if (existing !== null) {
    return { ownerId: existing, isNew: false };
  }
  return { ownerId: newOwnerId(), isNew: true };
}

export function ownerCookieHeader(ownerId: string): string {
  return [
    `${OWNER_COOKIE_NAME}=${ownerId}`,
    "Path=/",
    `Max-Age=${OWNER_COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
  ].join("; ");
}

export function withOwnerCookie(
  response: Response,
  ownerId: string,
  isNew: boolean,
): Response {
  if (!isNew) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", ownerCookieHeader(ownerId));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
