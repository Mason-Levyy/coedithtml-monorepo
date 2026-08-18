import type { AcceptedUpload } from "@/lib/accept-upload";
import type { WorkerEnv } from "@/lib/env";
import { checkHtmlDocument } from "@/lib/html-document";
import { MCP_MAX_ARTIFACT_BYTES, chargeMcpUpload } from "../ceilings";

const encoder = new TextEncoder();

const MAX_MEGABYTES = Math.round(MCP_MAX_ARTIFACT_BYTES / (1024 * 1024));

const TOO_LARGE = `That file is over ${MAX_MEGABYTES}MB, which is more than this connector will carry. Large inlined images are usually the cause. If this artifact is already on Coedit, call coedit_get_upload_link and POST the file there directly instead of retrying this call; otherwise link the images rather than inlining them and send it again.`;

const REFUSED: Record<string, string> = {
  "needs-build-step":
    "That file needs a build step. Send one self-contained HTML document with its CSS and JavaScript inline, and no bare imports.",
  "not-html": "That is not an HTML document. It needs an <html> element.",
  "no-closing-html-tag":
    "That document never closes its <html> element, so it is incomplete.",
  "has-own-csp":
    "That document carries its own Content-Security-Policy meta tag, which would stop Coedit's editor from loading inside it. Remove it and send it again.",
};

export type AcceptedArtifact =
  { ok: true; upload: AcceptedUpload } | { ok: false; message: string };

export async function acceptArtifact(
  artifact: { html: string; fileName: string; password?: string },
  context: { request: Request; env: WorkerEnv },
): Promise<AcceptedArtifact> {
  const bytes = encoder.encode(artifact.html);
  if (bytes.byteLength > MCP_MAX_ARTIFACT_BYTES) {
    return { ok: false, message: TOO_LARGE };
  }

  if (!/\.html?$/i.test(artifact.fileName)) {
    return {
      ok: false,
      message: "The fileName has to end in .html.",
    };
  }

  const document = checkHtmlDocument(artifact.html);
  if (!document.ok) {
    return {
      ok: false,
      message:
        REFUSED[document.reason] ??
        "Coedit would not accept that file. It must be one complete HTML document that runs without a build step.",
    };
  }

  const refused = await chargeMcpUpload(context.request, context.env);
  if (refused !== null) {
    return { ok: false, message: refused };
  }

  return {
    ok: true,
    upload: {
      fileName: artifact.fileName,
      bytes: bytes.buffer as ArrayBuffer,
      password: artifact.password ?? null,
      draft: false,
    },
  };
}
