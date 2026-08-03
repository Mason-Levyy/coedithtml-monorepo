import { useQuery } from "@tanstack/react-query";
import { fetchArtifact } from "@/lib/fetch-artifact";

export function useArtifact(token: string) {
  return useQuery({
    queryKey: ["artifact", token],
    queryFn: () => fetchArtifact(token),
    retry: false,
  });
}
