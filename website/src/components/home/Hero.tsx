import Link from "next/link";
import { ArtifactMock } from "@/components/ArtifactMock";
import { APP_URL } from "@/lib/links";

export function Hero() {
  return (
    <section className="hero">
      <div className="shell hero__grid">
        <div>
          <p className="eyebrow">Real-time HTML collaboration</p>
          <h1>Review and edit HTML together.</h1>
          <p className="lede">
            Share interactive HTML files with a simple link. Viewers can explore
            the live page, leave comments, and edit copy directly in their
            browser with no accounts or installation required.
          </p>
          <div className="hero__actions">
            <a className="btn" href={APP_URL}>
              Upload a file
            </a>
            <Link className="btn btn--quiet" href="/tutorial/">
              Try the tutorial
            </Link>
          </div>
          <p className="note">
            Free to use. Instant setup. Works in any browser.
          </p>
        </div>

        <ArtifactMock />
      </div>
    </section>
  );
}
