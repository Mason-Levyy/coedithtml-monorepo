import type { HtmlDocumentRejection } from "@/lib/html-document";
import { jsonResponse } from "@/lib/responses";

export type UploadRejectionReason =
  | HtmlDocumentRejection
  | "not-form"
  | "several-files"
  | "too-large"
  | "wrong-extension"
  | "empty-file";

export type RejectionCopy = {
  headline: string;
  detail: string;
  remedy: string | null;
};

// A refusal has to answer two questions, and they are not the same question:
// what is wrong with this file, and what do I do now. A file that is nearly
// right gets a specific next step; a file that was never going to work says so
// plainly rather than implying one more try would fix it.
const COPY: Record<UploadRejectionReason, RejectionCopy> = {
  "needs-build-step": {
    headline: "This is source, not a page",
    detail:
      "It has imports or components in it, so something has to build it before a browser can run it. Coedit never builds anything — it serves your file exactly as you uploaded it.",
    remedy:
      "Export or build the project first, then upload the .html a browser would open.",
  },
  "not-html": {
    headline: "This is not an HTML document",
    detail:
      "There is no <html> tag anywhere in the file, so there is no page here to host.",
    remedy:
      "If your tool gave you a folder or a .zip, the file you want is the .html inside it.",
  },
  "no-closing-html-tag": {
    headline: "This document is cut off",
    detail:
      "There is no closing </html> tag. That usually means the download stopped early or the file was truncated on its way out of whatever made it.",
    remedy: "Save it again from that tool and upload the whole file.",
  },
  "has-own-csp": {
    headline: "This file sets its own Content-Security-Policy",
    detail:
      "That policy can block the editor without telling either of us, so the page would load and none of the marking up would work.",
    remedy:
      'Delete the <meta http-equiv="Content-Security-Policy"> tag and upload it again.',
  },
  "wrong-extension": {
    headline: "Only a single .html file",
    detail:
      "Coedit hosts one self-contained HTML file — the kind an AI tool hands you when you ask for a page.",
    remedy: null,
  },
  "several-files": {
    headline: "One file, not several",
    detail:
      "Coedit hosts a single self-contained HTML file, so there is no second file for the first one to reference.",
    remedy: "Upload the one .html that has the whole page in it.",
  },
  "too-large": {
    headline: "This file is over 5MB",
    detail:
      "The ceiling is there so one upload cannot run up the bill for everyone else.",
    remedy:
      "Large embedded images are usually the cause. Link them instead of inlining them, and the file will be a fraction of the size.",
  },
  "empty-file": {
    headline: "This file is empty",
    detail: "There are no bytes in it at all.",
    remedy: null,
  },
  "not-form": {
    headline: "That upload did not arrive intact",
    detail: "The request did not carry a single .html file as form data.",
    remedy: "Try it again.",
  },
};

export function rejectionCopy(reason: UploadRejectionReason): RejectionCopy {
  return COPY[reason];
}

export function describeRejection(reason: UploadRejectionReason): string {
  const { headline, detail } = rejectionCopy(reason);
  return `${headline}. ${detail}`;
}

export function rejectionResponse(
  reason: UploadRejectionReason,
  status: number,
): Response {
  const { headline, detail, remedy } = rejectionCopy(reason);
  return jsonResponse({ error: detail, reason, headline, remedy }, status);
}
