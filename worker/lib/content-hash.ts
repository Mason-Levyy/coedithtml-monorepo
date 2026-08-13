const REVISION_HEX_LENGTH = 16;

export async function revisionOf(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, REVISION_HEX_LENGTH);
}
