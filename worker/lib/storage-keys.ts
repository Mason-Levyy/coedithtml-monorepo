function randomId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function newArtifactId(): string {
  return randomId();
}

export function newToken(): string {
  return randomId();
}

export function artifactObjectKey(artifactId: string): string {
  return `artifacts/${artifactId}.html`;
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
