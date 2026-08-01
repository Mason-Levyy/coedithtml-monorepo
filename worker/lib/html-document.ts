export type HtmlDocumentRejection =
  "needs-build-step" | "not-html" | "no-closing-html-tag";

export type HtmlDocumentCheck =
  { ok: true } | { ok: false; reason: HtmlDocumentRejection };

const BUILD_STEP_MARKERS = [
  /^\s*import\s[\s\S]*?\sfrom\s+['"]/m,
  /^\s*export\s+default\s/m,
  // PascalCase specifically: a JSX component is <Slide>, while <HTML> and
  // <BODY> are legal, if dated, HTML that must still be accepted.
  /<\/?[A-Z][a-z][A-Za-z0-9]*[\s/>]/,
];

const OPENING_HTML_TAG = /<html[\s>]/i;

const CLOSING_HTML_TAG = /<\/html\s*>/i;

export function checkHtmlDocument(source: string): HtmlDocumentCheck {
  if (BUILD_STEP_MARKERS.some((marker) => marker.test(source))) {
    return { ok: false, reason: "needs-build-step" };
  }
  if (!OPENING_HTML_TAG.test(source)) {
    return { ok: false, reason: "not-html" };
  }
  if (!CLOSING_HTML_TAG.test(source)) {
    return { ok: false, reason: "no-closing-html-tag" };
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
  }
}
