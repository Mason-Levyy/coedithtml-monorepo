export type CappedBody =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: "too-large" | "unreadable" };

export async function readBodyWithinLimit(
  request: Request,
  maxBytes: number,
): Promise<CappedBody> {
  const body = request.body;
  if (body === null) {
    return { ok: false, reason: "unreadable" };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}
