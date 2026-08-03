import { useMutation } from "@tanstack/react-query";
import { uploadArtifact } from "@/lib/upload-artifact";

export function useUploadArtifact() {
  return useMutation({
    mutationFn: uploadArtifact,
  });
}
