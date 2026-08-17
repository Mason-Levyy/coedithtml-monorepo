import {
  overlayToMarkdown,
  parseOverlayDocument,
  type OverlayEntry,
} from "@coedithtml/protocol";
import {
  appendToArtifact,
  DOWNLOAD_ASSET_PATH,
  downloadFileName,
  downloadScript,
  feedbackSection,
  type DownloadChoice,
} from "@/lib/artifact-download";
import { readArtifactBytes } from "@/lib/artifact-cache";
import type { WorkerEnv } from "@/lib/env";
import type { ResolvedArtifact } from "@/lib/resolve-artifact";
import { ROOM_OVERLAY_PATH, ROOM_REVISION_HEADER } from "@/lib/room-headers";

const UNAVAILABLE = "Could not prepare the download. Try again.";

async function readOverlay(
  env: WorkerEnv,
  artifactId: string,
  revision: string,
): Promise<OverlayEntry[] | null> {
  try {
    const room = env.DOC_ROOM.get(env.DOC_ROOM.idFromName(artifactId));
    const response = await room.fetch(
      new Request(`https://room.invalid${ROOM_OVERLAY_PATH}`, {
        headers: { [ROOM_REVISION_HEADER]: revision },
      }),
    );
    if (!response.ok) {
      return null;
    }
    const overlay = parseOverlayDocument(await response.json());
    return overlay === null ? null : overlay.entries;
  } catch (cause) {
    console.error("Failed to read the overlay for a download", cause);
    return null;
  }
}

async function readRuntimeBundle(
  request: Request,
  env: WorkerEnv,
): Promise<string | null> {
  const response = await env.ASSETS.fetch(
    new Request(new URL(DOWNLOAD_ASSET_PATH, request.url)),
  );
  return response.ok ? response.text() : null;
}

// A header value is a ByteString, so any code point above U+00FF makes
// Headers.set throw -- every download of a file named in Chinese, Japanese, or
// with an emoji in it was a 500. RFC 6266 is the answer: an ASCII filename any
// client can read, and the real one beside it, percent-encoded.
export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/gu, "_").replace(/["\\]/g, "");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*!]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function attachment(
  body: BodyInit,
  fileName: string,
  headers: Headers,
): Response {
  const merged = new Headers(headers);
  merged.set("content-type", "application/octet-stream");
  merged.set("content-disposition", contentDisposition(fileName));
  return new Response(body, { status: 200, headers: merged });
}

export async function handleArtifactDownload(options: {
  request: Request;
  env: WorkerEnv;
  headers: Headers;
  artifact: ResolvedArtifact;
  choice: DownloadChoice;
}): Promise<Response> {
  const { request, env, headers, artifact, choice } = options;
  const { artifactId, metadata } = artifact;
  const fileName = downloadFileName(metadata.fileName, choice);

  const entries = (await readOverlay(env, artifactId, metadata.revision)) ?? [];

  if (choice === "feedback") {
    const markdown = overlayToMarkdown({
      fileName: metadata.fileName,
      entries,
      orphaned: [],
    });
    return attachment(
      markdown.length > 0 ? markdown : "# No feedback yet\n",
      fileName,
      headers,
    );
  }

  const stored = await readArtifactBytes(
    env.ARTIFACT_STORE,
    artifactId,
    metadata.revision,
  );
  if (!stored.ok) {
    console.error("Failed to read an artifact for download", stored.cause);
    return new Response(UNAVAILABLE, { status: 500, headers });
  }
  if (stored.bytes === null) {
    return new Response("Not found", { status: 404, headers });
  }

  const bundle = await readRuntimeBundle(request, env);
  if (bundle === null) {
    console.error("The download bundle is missing from the assets");
    return new Response(UNAVAILABLE, { status: 500, headers });
  }

  return attachment(
    appendToArtifact(
      stored.bytes,
      downloadScript(entries, bundle, choice),
      choice === "everything" ? feedbackSection(entries) : "",
    ),
    fileName,
    headers,
  );
}
