export type HtmlDocumentRejection =
  "needs-build-step" | "not-html" | "no-closing-html-tag" | "has-own-csp";

export type HtmlDocumentCheck =
  { ok: true } | { ok: false; reason: HtmlDocumentRejection };

// An import statement lives on one line. Letting the gap between `import` and
// `from` span the whole document meant every `import` in a five-megabyte file
// re-scanned the rest of it looking for a `from` that was never coming.
const BUILD_STEP_MARKERS = [
  /^\s*import\s[^\n]{0,500}?\sfrom\s+['"]/m,
  /^\s*export\s+default\s/m,
  /<\/?[A-Z][a-z][A-Za-z0-9]*[\s/>]/,
];

const SCRIPT_OPEN = /<script\b/gi;
const SCRIPT_CLOSE = "</script";

// A regex spanning from `<script` to `</script>` re-scans to end-of-file for
// every unterminated `<script` in the document, and an uploader chooses the
// document. One pass with indexOf is linear whatever the input looks like.
function withoutScriptContents(source: string): string {
  const lowered = source.toLowerCase();
  const kept: string[] = [];
  let cursor = 0;
  SCRIPT_OPEN.lastIndex = 0;
  for (
    let opened = SCRIPT_OPEN.exec(source);
    opened !== null;
    opened = SCRIPT_OPEN.exec(source)
  ) {
    kept.push(source.slice(cursor, opened.index));
    const closed = lowered.indexOf(SCRIPT_CLOSE, opened.index);
    if (closed === -1) {
      return kept.join("");
    }
    cursor = closed + SCRIPT_CLOSE.length;
    SCRIPT_OPEN.lastIndex = cursor;
  }
  kept.push(source.slice(cursor));
  return kept.join("");
}

const OPENING_HTML_TAG = /<html[\s>]/i;

const CLOSING_HTML_TAG = /<\/html\s*>/i;

const META_OPEN = "<meta";
const CSP_HTTP_EQUIV =
  /http-equiv\s*=\s*["']?Content-Security-Policy["']?(?=[\s/>"'])/i;

// Walking `>` to `>` visits each one once. Letting a regex look for the
// attribute across an unbounded run of non-`>` restarted that search at every
// `<meta` in the document, and a document full of unclosed meta tags is a
// thing an uploader can hand us.
function hasOwnCspMetaTag(source: string): boolean {
  const lowered = source.toLowerCase();
  let cursor = 0;
  for (;;) {
    const start = lowered.indexOf(META_OPEN, cursor);
    if (start === -1) {
      return false;
    }
    const end = lowered.indexOf(">", start);
    if (end === -1) {
      return false;
    }
    if (/\s/.test(source.charAt(start + META_OPEN.length))) {
      const tag = source.slice(start, end + 1);
      if (CSP_HTTP_EQUIV.test(tag)) {
        return true;
      }
    }
    cursor = end + 1;
  }
}

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
  if (hasOwnCspMetaTag(source)) {
    return { ok: false, reason: "has-own-csp" };
  }
  return { ok: true };
}
