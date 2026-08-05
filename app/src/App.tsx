import { ArtifactPage } from "@/components/ArtifactPage";
import { LandingPage } from "@/components/LandingPage";
import { viewerTokenFromPath } from "@/lib/viewer-path";

export function App() {
  const token = viewerTokenFromPath(window.location.pathname);

  if (token === null) {
    return <LandingPage />;
  }
  return (
    <div className="min-h-dvh">
      <ArtifactPage token={token} />
    </div>
  );
}
