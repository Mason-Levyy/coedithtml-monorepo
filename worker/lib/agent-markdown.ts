export function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/markdown");
}

export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function markdownResponse(
  body: string,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "text/markdown; charset=utf-8");
  headers.set("x-markdown-tokens", String(estimateTokenCount(body)));
  return new Response(body, {
    status,
    headers,
  });
}
