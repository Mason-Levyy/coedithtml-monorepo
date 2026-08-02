type ArtifactFrameProps = {
  src: string;
  title: string;
};

export function ArtifactFrame({ src, title }: ArtifactFrameProps) {
  return (
    <iframe
      src={src}
      title={title}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}
