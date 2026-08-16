import { useMutation, useQueryClient } from "@tanstack/react-query";
import { publishArtifact } from "@/lib/my-artifacts";
import { MY_ARTIFACTS_QUERY_KEY } from "./useMyArtifacts";

export function usePublishArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      artifactId,
      password,
    }: {
      artifactId: string;
      password?: string | null;
    }) => publishArtifact(artifactId, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_ARTIFACTS_QUERY_KEY });
    },
  });
}
