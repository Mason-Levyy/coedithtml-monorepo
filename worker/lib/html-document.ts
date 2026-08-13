export type HtmlDocumentRejection =
  "needs-build-step" | "not-html" | "no-closing-html-tag" | "has-own-csp";

export type HtmlDocumentCheck =
  { ok: true } | { ok: false; reason: HtmlDocumentRejection };

const BUILD_STEP_MARKERS = [
  /^\s*import\s[\s\S]*?\sfrom\s+['"]/m,
  /^\s*export\s+default\s/m,
  /<\/?[A-Z][a-z][A-Za-z0-9]*[\s/>]/,
];

const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;

function withoutScriptContents(source: string): string {
  return source.replace(SCRIPT_BLOCK, "");
}

const OPENING_HTML_TAG = /<html[\s>]/i;

const CLOSING_HTML_TAG = /<\/html\s*>/i;

const OWN_CSP_META_TAG =
  /<meta\s[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?(?=[\s/>])[^>]*>/i;

export function checkHtmlDocument(source: string): HtmlDocumentCheck {
  const outsideScripts = withoutScriptContents(source);
  if (BUILD_STEP_MARKERS.some((marker) => marker.test(outsideScripts))) {
    return { ok: false, reason: "needs-build-step" };
  }
  if (!OPENING_HTML_TAG.test(source)) {
    return { ok: false, reason: "not-html" };
  }
  if (!CLOSING_HTML_TAG.test(source)) {
    return { ok: false, reason: "no-closing-html-tag" };
  }
  if (OWN_CSP_META_TAG.test(source)) {
    return { ok: false, reason: "has-own-csp" };
  }
  return { ok: true };
}

export function describeRejection(reason: HtmlDocumentRejection): string {
  switch (reason) {
    case "needs-build-step":
      return "This file needs a build step. Upload the HTML a browser would run, not its source.";
    case "not-html":
      return "This file is not an HTML document.";
    case "no-closing-html-tag":
      return "This HTML document is incomplete — it has no closing </html> tag.";
    case "has-own-csp":
      return "This file sets its own Content-Security-Policy, which can silently block the editor. Remove the <meta> CSP tag and re-upload.";
  }
}
