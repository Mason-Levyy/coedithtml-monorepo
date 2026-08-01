// Artifact ids address a public URL, so they are generated unguessably rather
// than sequentially. They are not a capability on their own — view and edit
// tokens are separate and land with the share flow.
export function newArtifactId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function artifactObjectKey(artifactId: string): string {
  return `artifacts/${artifactId}.html`;
}
