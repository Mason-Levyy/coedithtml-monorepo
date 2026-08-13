import { z } from "zod";
import { readErrorMessage } from "@/lib/api-error";

const replaceResponseSchema = z.object({
  revision: z.string(),
  replaced: z.boolean(),
});

export type ReplaceResult = z.infer<typeof replaceResponseSchema>;

export async function replaceArtifact(
  token: string,
  file: File,
): Promise<ReplaceResult> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(
    `/api/artifacts/${encodeURIComponent(token)}/revisions`,
    { method: "POST", body: form },
  );
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Could not replace the file. Try again.",
      ),
    );
  }

  const parsed = replaceResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("The server returned an unexpected response.");
  }
  return parsed.data;
}
