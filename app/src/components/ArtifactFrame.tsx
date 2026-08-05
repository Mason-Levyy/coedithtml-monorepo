import type { Ref } from "react";

type ArtifactFrameProps = {
  src: string;
  title: string;
  height?: string;
  ref?: Ref<HTMLIFrameElement>;
};

export function ArtifactFrame({
  src,
  title,
  height = "100%",
  ref,
}: ArtifactFrameProps) {
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", height, border: "none", display: "block" }}
    />
  );
}
