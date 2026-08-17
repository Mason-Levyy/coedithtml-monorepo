const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export const SAVE_FAILED = "Could not save the file. Try again.";

export function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function jsonError(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}
