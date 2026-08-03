// Salted with the artifact id, not a random per-hash salt: the id is already
// unique per artifact, which is all a salt needs to be here, and it lets
// verification stay a pure function of (artifactId, password, hash).
async function digest(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const hashed = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hashed)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function hashArtifactPassword(
  artifactId: string,
  password: string,
): Promise<string> {
  return digest(password, artifactId);
}

export async function verifyArtifactPassword(
  artifactId: string,
  password: string,
  hash: string,
): Promise<boolean> {
  return (await digest(password, artifactId)) === hash;
}
