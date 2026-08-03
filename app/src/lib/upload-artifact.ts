import { z } from "zod";
import { readErrorMessage } from "@/lib/api-error";

export const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;

const uploadResponseSchema = z.object({
  artifactId: z.string(),
  viewToken: z.string(),
  editToken: z.string(),
  viewUrl: z.string(),
  editUrl: z.string(),
});

export type UploadResult = z.infer<typeof uploadResponseSchema>;

function isHtmlFile(file: File): boolean {
  return /\.html?$/i.test(file.name);
}

export function validateArtifactFile(file: File): string | null {
  if (!isHtmlFile(file)) {
    return "Only a single .html file can be uploaded.";
  }
  if (file.size === 0) {
    return "The file is empty.";
  }
  if (file.size > MAX_ARTIFACT_BYTES) {
    return "The file is larger than 5MB.";
  }
  return null;
}

export async function uploadArtifact(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/artifacts", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Could not upload the file. Try again."),
    );
  }

  const parsed = uploadResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("The server returned an unexpected response.");
  }
  return parsed.data;
}
