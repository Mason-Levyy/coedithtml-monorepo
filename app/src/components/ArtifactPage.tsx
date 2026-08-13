import { useArtifact, useUnlockArtifact } from "@/hooks/useArtifact";
import { ArtifactViewer } from "@/components/ArtifactViewer";
import { PasswordPrompt } from "@/components/PasswordPrompt";
import { artifactSrcFor } from "@/lib/artifact-src";

type ArtifactPageProps = {
  token: string;
};

function Notice({ children }: { children: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-8">
      <p className="font-mono text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function ArtifactPage({ token }: ArtifactPageProps) {
  const artifact = useArtifact(token);
  const unlock = useUnlockArtifact(token);

  if (artifact.isPending) {
    return <Notice>Loading…</Notice>;
  }
  if (artifact.isError) {
    return <Notice>{artifact.error.message}</Notice>;
  }
  if (artifact.data.requiresPassword) {
    return (
      <PasswordPrompt
        onSubmit={(password) => unlock.mutate(password)}
        pending={unlock.isPending}
        errorMessage={unlock.error?.message ?? null}
      />
    );
  }

  return (
    <ArtifactViewer
      token={token}
      src={artifactSrcFor(artifact.data)}
      sandboxOrigin={artifact.data.sandboxOrigin}
      fileName={artifact.data.fileName}
      shareLinks={artifact.data.shareLinks}
    />
  );
}
