const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// Every message reaching this function is written to be read by the person who
// uploaded the file. Causes and stack traces go to the log instead.
export function jsonError(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}
