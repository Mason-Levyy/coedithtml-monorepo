import { z } from "zod";

// Single-file artifacts with inline CSS and JS. Large enough for an inlined
// font or a base64 image, small enough that a runaway upload cannot fill R2.
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
