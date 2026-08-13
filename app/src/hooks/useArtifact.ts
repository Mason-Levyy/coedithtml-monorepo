import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchArtifact, unlockArtifact } from "@/lib/fetch-artifact";
import { replaceArtifact } from "@/lib/replace-artifact";

function artifactKey(token: string): [string, string] {
  return ["artifact", token];
}

export function useArtifact(token: string) {
  return useQuery({
    queryKey: artifactKey(token),
    queryFn: () => fetchArtifact(token),
    retry: false,
  });
}

export function useReplaceArtifact(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => replaceArtifact(token, file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: artifactKey(token) }),
  });
}

export function useUnlockArtifact(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => unlockArtifact(token, password),
    onSuccess: (artifact) => {
      queryClient.setQueryData(artifactKey(token), artifact);
    },
  });
}
