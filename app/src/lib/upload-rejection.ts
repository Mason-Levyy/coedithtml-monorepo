import { z } from "zod";

export type UploadRejection = {
  headline: string;
  detail: string;
  remedy: string | null;
};

const rejectionBodySchema = z.object({
  error: z.string(),
  headline: z.string().optional(),
  remedy: z.string().nullable().optional(),
});

// The worker owns every word of this. A refusal explained in two places drifts
// into two different explanations, and the one the reader sees is the one the
// server never checked.
export async function readRejection(
  response: Response,
  fallback: string,
): Promise<UploadRejection> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = rejectionBodySchema.safeParse(body);
  if (!parsed.success) {
    return { headline: "Upload rejected", detail: fallback, remedy: null };
  }
  return {
    headline: parsed.data.headline ?? "Upload rejected",
    detail: parsed.data.error,
    remedy: parsed.data.remedy ?? null,
  };
}

export class UploadRejected extends Error {
  readonly rejection: UploadRejection;

  constructor(rejection: UploadRejection) {
    super(`${rejection.headline}. ${rejection.detail}`);
    this.name = "UploadRejected";
    this.rejection = rejection;
  }
}

export function rejectionOf(error: unknown): UploadRejection | null {
  if (error instanceof UploadRejected) {
    return error.rejection;
  }
  if (error instanceof Error) {
    return { headline: "Upload rejected", detail: error.message, remedy: null };
  }
  return null;
}
