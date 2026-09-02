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
