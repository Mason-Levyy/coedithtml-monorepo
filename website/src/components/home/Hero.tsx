import { ArtifactMock } from "@/components/ArtifactMock";
import { TutorialLink } from "@/components/TutorialLink";
import { APP_URL } from "@/lib/links";

export function Hero() {
  return (
    <section className="hero">
      <div className="shell hero__grid">
        <div>
          <h1>Review and edit HTML together.</h1>
          <p className="lede">
            Share interactive HTML files with a link. Then explore the page,
            leave comments, and edit it directly in your browser.
          </p>
          <div className="hero__actions">
            <a className="btn" href={APP_URL}>
              Upload a file
            </a>
            <TutorialLink className="btn btn--quiet">
              Try the tutorial
            </TutorialLink>
          </div>
        </div>

        <ArtifactMock />
      </div>
    </section>
  );
}
