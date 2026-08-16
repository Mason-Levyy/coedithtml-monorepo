import type { z } from "zod";

export async function requestJson<TSchema extends z.ZodTypeAny>(
  path: string,
  options: { schema: TSchema; fallbackError: string; init?: RequestInit },
): Promise<z.infer<TSchema>> {
  const response = await fetch(path, options.init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, options.fallbackError));
  }
  const parsed = options.schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Unexpected response from server.");
  }
  return parsed.data;
}

export async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    body !== null &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return fallback;
}
