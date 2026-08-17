import { z } from "zod";
import {
  readRejection,
  UploadRejected,
  type UploadRejection,
} from "@/lib/upload-rejection";

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

// The three things a browser can see without sending anything. The worker
// checks all three again and is the authority; this exists so nobody pushes
// five megabytes up the wire to be told the extension was wrong.
export function validateArtifactFile(file: File): UploadRejection | null {
  if (!isHtmlFile(file)) {
    return {
      headline: "Only a single .html file",
      detail:
        "Coedit hosts one self-contained HTML file — the kind an AI tool hands you when you ask for a page.",
      remedy: null,
    };
  }
  if (file.size === 0) {
    return {
      headline: "This file is empty",
      detail: "There are no bytes in it at all.",
      remedy: null,
    };
  }
  if (file.size > MAX_ARTIFACT_BYTES) {
    return {
      headline: "This file is over 5MB",
      detail:
        "The ceiling is there so one upload cannot run up the bill for everyone else.",
      remedy:
        "Large embedded images are usually the cause. Link them instead of inlining them, and the file will be a fraction of the size.",
    };
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
    throw new UploadRejected(
      await readRejection(response, "Could not upload the file. Try again."),
    );
  }

  const parsed = uploadResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("The server returned an unexpected response.");
  }
  return parsed.data;
}
