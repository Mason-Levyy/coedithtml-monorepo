const REVISION_QUERY_PARAM = "r";
const RESET_QUERY_PARAM = "reset";

function withParam(src: string, name: string, value: string): string {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}${name}=${encodeURIComponent(value)}`;
}

export function artifactSrcFor(artifact: {
  artifactUrl: string;
  revision: string;
}): string {
  return withParam(
    artifact.artifactUrl,
    REVISION_QUERY_PARAM,
    artifact.revision,
  );
}

// Removing an edit cannot un-apply it: `replayEdits` only ever moves forward,
// and the replaced wording is gone from the DOM. The stored bytes were never
// touched, so a reload of the frame is the reset — the surviving edits replay
// onto the original text in order.
export function frameSrcFor(src: string, reset: number): string {
  return reset === 0 ? src : withParam(src, RESET_QUERY_PARAM, String(reset));
}
