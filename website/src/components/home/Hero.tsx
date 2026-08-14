import Link from "next/link";
import { ArtifactMock } from "@/components/ArtifactMock";

export function Hero() {
  return (
    <section className="hero">
      <div className="shell hero__grid">
        <div>
          <p className="eyebrow">One file · one link · no account</p>
          <h1>Send the file, not a screenshot.</h1>
          <p className="lede">
            You have an HTML file. A deck, a dashboard, a one-pager. And three
            people who need to react to it. Upload it here and you get a link.
            It opens in their browser and works the way you built it.
          </p>
          <div className="hero__actions">
            <a className="btn" href="https://app.coedithtml.com">
              Upload a file
            </a>
            <Link className="btn btn--quiet" href="/how-it-works/">
              See how it works
            </Link>
          </div>
          <p className="note">No account. No install. One file, one link.</p>
        </div>

        <ArtifactMock />
      </div>
    </section>
  );
}
