import { useArtifactBridge } from "@/hooks/useArtifactBridge";
import { ArtifactFrame } from "@/components/ArtifactFrame";
import { ShareBar } from "@/components/ShareBar";

type ArtifactViewerProps = {
  src: string;
  sandboxOrigin: string;
  fileName: string;
};

// An artifact sized in viewport units grows every time its frame does.
const MAX_FRAME_HEIGHT = 10000;

function framePixelHeight(contentHeight: number): string {
  // A collapsed frame measures its content as collapsed, and never recovers.
  const floor = Math.max(window.innerHeight, 1);
  const clamped = Math.min(
    Math.max(contentHeight, floor),
    Math.max(MAX_FRAME_HEIGHT, floor),
  );
  return `${clamped}px`;
}

export function ArtifactViewer({
  src,
  sandboxOrigin,
  fileName,
}: ArtifactViewerProps) {
  const bridge = useArtifactBridge(sandboxOrigin);
  const fit = bridge.fit;
  const frameHeight =
    fit && fit.mode === "grows-to-content"
      ? framePixelHeight(fit.contentHeight)
      : undefined;

  // Without a definite parent height the frame's 100% resolves to 150px.
  const columnHeight = frameHeight ? "min-h-dvh" : "h-dvh";

  return (
    <div className={`flex ${columnHeight} flex-col bg-card`}>
      <div className="sticky top-0 z-10">
        <ShareBar title={bridge.title ?? fileName} fileName={fileName} />
      </div>
      <div className={frameHeight ? undefined : "min-h-0 flex-1"}>
        <ArtifactFrame src={src} title={fileName} height={frameHeight} />
      </div>
    </div>
  );
}
