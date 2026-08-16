import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LinkPermission } from "@/lib/link-permission";
import {
  deleteArtifact,
  fetchMyArtifacts,
  regenerateLink,
  revokeLinkToken,
  updateArtifactSettings,
} from "@/lib/my-artifacts";

export const MY_ARTIFACTS_QUERY_KEY = ["my-artifacts"];

const MY_ARTIFACTS_STALE_TIME = 30_000;

export function useMyArtifacts() {
  return useQuery({
    queryKey: MY_ARTIFACTS_QUERY_KEY,
    queryFn: fetchMyArtifacts,
    staleTime: MY_ARTIFACTS_STALE_TIME,
  });
}

function useMyArtifactsMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_ARTIFACTS_QUERY_KEY });
    },
  });
}

export function useUpdateArtifactSettings() {
  return useMyArtifactsMutation(
    ({
      artifactId,
      settings,
    }: {
      artifactId: string;
      settings: { password?: string | null };
    }) => updateArtifactSettings(artifactId, settings),
  );
}

export function useDeleteArtifact() {
  return useMyArtifactsMutation((artifactId: string) =>
    deleteArtifact(artifactId),
  );
}

export function useRevokeToken() {
  return useMyArtifactsMutation((token: string) => revokeLinkToken(token));
}

export function useRegenerateLink() {
  return useMyArtifactsMutation(
    ({ artifactId, kind }: { artifactId: string; kind: LinkPermission }) =>
      regenerateLink(artifactId, kind),
  );
}
