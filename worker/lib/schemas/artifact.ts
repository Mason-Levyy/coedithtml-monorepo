import { z } from "zod";

export const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;

// The multipart envelope costs boundaries and part headers on top of the file
// itself, so the body a request may send is capped a little higher.
export const MAX_UPLOAD_BODY_BYTES = MAX_ARTIFACT_BYTES + 64 * 1024;

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

export const MAX_PASSWORD_LENGTH = 200;

export const unlockRequestSchema = z.object({
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

const RANDOM_ID_PATTERN = /^[0-9a-f]{32}$/;

export const artifactIdSchema = z.string().regex(RANDOM_ID_PATTERN);

export const accessTokenSchema = z.string().regex(RANDOM_ID_PATTERN);
