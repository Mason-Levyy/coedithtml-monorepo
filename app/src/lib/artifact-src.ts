const REVISION_QUERY_PARAM = "r";

export function artifactSrcFor(artifact: {
  artifactUrl: string;
  revision: string;
}): string {
  const separator = artifact.artifactUrl.includes("?") ? "&" : "?";
  return `${artifact.artifactUrl}${separator}${REVISION_QUERY_PARAM}=${encodeURIComponent(artifact.revision)}`;
}
