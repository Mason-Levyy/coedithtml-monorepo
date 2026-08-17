import { isValidOwnerId } from "@/lib/owner-cookie";
import { newOwnerId } from "@/lib/storage-keys";

const encoder = new TextEncoder();

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signatureFor(ownerId: string, secret: string): Promise<string> {
  const signed = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    encoder.encode(ownerId),
  );
  return toBase64Url(signed).slice(0, 32);
}

export async function workspaceKeyFor(
  ownerId: string,
  secret: string,
): Promise<string> {
  return `${ownerId}.${await signatureFor(ownerId, secret)}`;
}

export async function ownerIdFromWorkspaceKey(
  key: unknown,
  secret: string,
): Promise<string | null> {
  if (typeof key !== "string") {
    return null;
  }
  const dot = key.indexOf(".");
  if (dot === -1) {
    return null;
  }
  const ownerId = key.slice(0, dot);
  if (!isValidOwnerId(ownerId)) {
    return null;
  }
  const expected = await signatureFor(ownerId, secret);
  const offered = key.slice(dot + 1);
  return offered.length === expected.length && offered === expected
    ? ownerId
    : null;
}

export async function resolveWorkspace(
  key: unknown,
  secret: string,
): Promise<{ ownerId: string; workspaceKey: string }> {
  const known = await ownerIdFromWorkspaceKey(key, secret);
  const ownerId = known ?? newOwnerId();
  return { ownerId, workspaceKey: await workspaceKeyFor(ownerId, secret) };
}
