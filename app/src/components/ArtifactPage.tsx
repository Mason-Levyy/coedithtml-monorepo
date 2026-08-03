import { useArtifact } from "@/hooks/useArtifact";
import { ArtifactViewer } from "@/components/ArtifactViewer";

type ArtifactPageProps = {
  token: string;
};

function Notice({ children }: { children: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="font-mono text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function ArtifactPage({ token }: ArtifactPageProps) {
  const artifact = useArtifact(token);

  if (artifact.isPending) {
    return <Notice>Loading…</Notice>;
  }
  if (artifact.isError) {
    return <Notice>{artifact.error.message}</Notice>;
  }

  return (
    <ArtifactViewer
      src={artifact.data.artifactUrl}
      sandboxOrigin={artifact.data.sandboxOrigin}
      title={artifact.data.fileName}
    />
  );
}
