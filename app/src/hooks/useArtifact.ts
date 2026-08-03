import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReadingProfile } from "@coedithtml/protocol";
import {
  fetchArtifact,
  setArtifactProfile,
  unlockArtifact,
} from "@/lib/fetch-artifact";

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

// Writes the unlocked artifact straight into the query cache: the grant only
// comes back on this response, and re-fetching without it would lock again.
export function useUnlockArtifact(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => unlockArtifact(token, password),
    onSuccess: (artifact) => {
      queryClient.setQueryData(artifactKey(token), artifact);
    },
  });
}

export function useSetArtifactProfile(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: ReadingProfile) => setArtifactProfile(token, profile),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: artifactKey(token) }),
  });
}
