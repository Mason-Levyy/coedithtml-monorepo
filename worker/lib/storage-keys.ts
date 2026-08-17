function randomId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function newArtifactId(): string {
  return randomId();
}

export function newToken(): string {
  return randomId();
}

export function artifactObjectKey(
  artifactId: string,
  revision: string,
): string {
  return `artifacts/${artifactId}/${revision}.html`;
}

// Blobs live under the owner, which is what keeps dedup from becoming an
// oracle: a global blob space would let an uploader learn whether a given file
// already exists somewhere in the system, and this product hosts other
// people's unreleased work. Owner-scoped still covers the case actually asked
// for -- the same person uploading the same file twice -- and keeps the
// reference set small enough to hold in that owner's own ledger.
//
// Nothing outside ever names one of these. A reader arrives with a token, the
// token resolves to an artifact, and the artifact's metadata is what says which
// blob to read. Two artifacts sharing bytes do not share a password gate,
// because the gate is checked against artifact metadata before R2 is touched.
export function blobObjectKey(ownerId: string, digest: string): string {
  return `blobs/${ownerId}/${digest}.html`;
}

export function artifactMetadataKey(artifactId: string): string {
  return `artifacts/${artifactId}`;
}

export function accessTokenKey(token: string): string {
  return `tokens/${token}`;
}

export function unlockGrantKey(grant: string): string {
  return `unlocks/${grant}`;
}

export function newUnlockGrant(): string {
  return randomId();
}

export function newOwnerId(): string {
  return randomId();
}

export function ownerArtifactsKey(ownerId: string): string {
  return `owners/${ownerId}/artifacts`;
}
