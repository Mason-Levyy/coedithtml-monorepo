import { z } from "zod";
import { readErrorMessage } from "@/lib/api-error";

export const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;

const publishedUploadSchema = z.object({
  artifactId: z.string(),
  viewToken: z.string(),
  suggestToken: z.string(),
  editToken: z.string(),
  viewUrl: z.string(),
  suggestUrl: z.string(),
  editUrl: z.string(),
  published: z.boolean().optional(),
});

const draftUploadSchema = z.object({
  artifactId: z.string(),
  fileName: z.string(),
  size: z.number(),
  uploadedAt: z.string(),
  draft: z.literal(true),
  restoredComments: z.number().optional(),
});

export const uploadResponseSchema = z.union([
  publishedUploadSchema,
  draftUploadSchema,
]);

export type UploadResult = z.infer<typeof uploadResponseSchema>;
export type PublishedUploadResult = z.infer<typeof publishedUploadSchema>;
export type DraftUploadResult = z.infer<typeof draftUploadSchema>;

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

export type UploadInput = {
  file: File;
  password?: string | null;
  draft?: boolean;
};

export async function uploadArtifact({
  file,
  password = null,
  draft = false,
}: UploadInput): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (password !== null && password !== undefined && password.length > 0) {
    form.append("password", password);
  }
  if (draft) {
    form.append("draft", "true");
  }

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
