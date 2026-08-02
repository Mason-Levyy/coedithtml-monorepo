import { z } from "zod";

export const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;

export const uploadFieldName = "file";

export const uploadedArtifactSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .refine((name) => /\.html?$/i.test(name), {
      message: "Only a single .html file can be uploaded",
    }),
  size: z
    .number()
    .int()
    .positive({ message: "The file is empty" })
    .max(MAX_ARTIFACT_BYTES, {
      message: "The file is larger than 5MB",
    }),
});

export type UploadedArtifact = z.infer<typeof uploadedArtifactSchema>;

export const artifactIdSchema = z.string().regex(/^[0-9a-f]{32}$/);
