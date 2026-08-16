import type { z } from "zod";

export type ParsedBody<Schema extends z.ZodTypeAny> =
  { ok: true; body: z.infer<Schema> } | { ok: false };

function safeJsonParse(
  text: string,
): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export async function parseJsonBody<Schema extends z.ZodTypeAny>(
  request: Request,
  schema: Schema,
): Promise<ParsedBody<Schema>> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false };
  }

  const raw = text ? safeJsonParse(text) : { ok: true as const, value: {} };
  if (!raw.ok) {
    return { ok: false };
  }

  const parsed = schema.safeParse(raw.value);
  return parsed.success ? { ok: true, body: parsed.data } : { ok: false };
}
