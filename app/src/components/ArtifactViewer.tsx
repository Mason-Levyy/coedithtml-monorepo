import { useArtifactBridge } from "@/hooks/useArtifactBridge";
import { ArtifactFrame } from "@/components/ArtifactFrame";
import { ShareBar } from "@/components/ShareBar";

type ArtifactViewerProps = {
  src: string;
  sandboxOrigin: string;
  fileName: string;
};

export function ArtifactViewer({
  src,
  sandboxOrigin,
  fileName,
}: ArtifactViewerProps) {
  const bridge = useArtifactBridge(sandboxOrigin);

  return (
    <div className="flex h-full flex-col bg-card">
      <ShareBar
        title={bridge.status === "ready" ? bridge.title : fileName}
        fileName={fileName}
      />
      <div className="min-h-0 flex-1">
        <ArtifactFrame src={src} title={fileName} />
      </div>
    </div>
  );
}
