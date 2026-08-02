export function newArtifactId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function artifactObjectKey(artifactId: string): string {
  return `artifacts/${artifactId}.html`;
}
