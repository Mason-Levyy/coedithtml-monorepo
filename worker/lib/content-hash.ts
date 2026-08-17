const REVISION_HEX_LENGTH = 16;

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Sixty-four bits, and deliberately only a name. It labels one revision of one
// artifact, whose bytes that artifact's own owner chose, and it appears in URLs
// where a short string is worth having.
export async function revisionOf(bytes: ArrayBuffer): Promise<string> {
  return (await sha256(bytes)).slice(0, REVISION_HEX_LENGTH);
}

// The full digest, because an address is not a name. A 64-bit truncation is
// birthday-attackable at roughly 2^32 work, and a crafted pair of files sharing
// a truncated digest would let one artifact serve another's bytes.
export async function blobDigestOf(bytes: ArrayBuffer): Promise<string> {
  return sha256(bytes);
}
