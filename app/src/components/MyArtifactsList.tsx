import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  useDeleteArtifact,
  useMyArtifacts,
  useRegenerateLink,
  useRevokeToken,
  useUpdateArtifactSettings,
} from "@/hooks/useMyArtifacts";
import type { MyArtifactItem } from "@/lib/my-artifacts";
import { ArtifactSettingsModal } from "./ArtifactSettingsModal";

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type MyArtifactsListProps = {
  onUploadClick: () => void;
  onPublishDraft?: (artifact: MyArtifactItem) => void;
};

export function MyArtifactsList({
  onUploadClick,
  onPublishDraft,
}: MyArtifactsListProps) {
  const { data: artifacts, isLoading, error } = useMyArtifacts();
  const updateSettings = useUpdateArtifactSettings();
  const deleteArtifact = useDeleteArtifact();
  const revokeToken = useRevokeToken();
  const regenerateLink = useRegenerateLink();
  const clipboard = useCopyToClipboard();

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );
  const selectedArtifact =
    artifacts?.find((a) => a.artifactId === selectedArtifactId) ?? null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground font-mono text-sm">
        Loading your files…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive font-mono text-sm border border-destructive/20 bg-destructive/5 rounded-xl">
        Could not load files. Please try again.
      </div>
    );
  }

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line bg-card p-12 text-center shadow-xs">
        <div className="flex flex-col gap-1">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
            No files uploaded yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Upload your first HTML file to start collaborating and managing your
            shared links.
          </p>
        </div>
        <Button type="button" onClick={onUploadClick}>
          Upload a file
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {artifacts.length} {artifacts.length === 1 ? "File" : "Files"}
        </span>
        <Button type="button" size="sm" onClick={onUploadClick}>
          + Upload New File
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {artifacts.map((artifact) => {
          const primaryUrl =
            artifact.viewUrl ?? artifact.suggestUrl ?? artifact.editUrl;
          const openUrl =
            artifact.editUrl ?? artifact.suggestUrl ?? artifact.viewUrl;

          return (
            <div
              key={artifact.artifactId}
              className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-xs transition-colors hover:border-ink/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground truncate">
                    {artifact.fileName}
                  </span>
                  {artifact.hasPassword && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      Password
                    </span>
                  )}
                  {!artifact.published && (
                    <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-line">
                      Draft
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Uploaded {formatDate(artifact.uploadedAt)}
                </span>
                {/* The only channel an anonymous owner has. Opening the file
                    is what resets the clock, which is why the notice says so. */}
                {artifact.expiresAt !== undefined && (
                  <span className="text-xs font-mono text-amber-700 dark:text-amber-400">
                    Nobody has opened this in a while. It goes on{" "}
                    {formatDate(artifact.expiresAt)} unless somebody does.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!artifact.published && onPublishDraft ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onPublishDraft(artifact)}
                  >
                    Publish
                  </Button>
                ) : (
                  <>
                    {primaryUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => clipboard.copy(primaryUrl)}
                      >
                        {copyLabel(clipboard.state, "Copy Link")}
                      </Button>
                    )}
                    {openUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(openUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        Open
                      </Button>
                    )}
                  </>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedArtifactId(artifact.artifactId)}
                  aria-label="Manage file settings"
                >
                  Settings
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedArtifact && (
        <ArtifactSettingsModal
          artifact={selectedArtifact}
          onClose={() => setSelectedArtifactId(null)}
          onUpdatePassword={(password) =>
            updateSettings.mutateAsync({
              artifactId: selectedArtifact.artifactId,
              settings: { password },
            })
          }
          onRevokeToken={(token) => revokeToken.mutateAsync(token)}
          onRegenerateLink={(kind) =>
            regenerateLink.mutateAsync({
              artifactId: selectedArtifact.artifactId,
              kind,
            })
          }
          onDeleteArtifact={async () => {
            await deleteArtifact.mutateAsync(selectedArtifact.artifactId);
            setSelectedArtifactId(null);
          }}
        />
      )}
    </div>
  );
}
