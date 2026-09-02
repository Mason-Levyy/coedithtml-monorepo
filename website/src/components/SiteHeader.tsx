import Link from "next/link";
import { TutorialLink } from "@/components/TutorialLink";
import { Wordmark } from "@/components/Wordmark";
import { APP_URL, GITHUB_URL } from "@/lib/links";

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="masthead__inner shell">
        <Wordmark />
        <nav>
          <TutorialLink>Tutorial</TutorialLink>
          <Link href="/connect/">MCP Setup</Link>
          <Link href="/report/">Report a File</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="btn btn--small" href={APP_URL}>
            Open the app
          </a>
        </nav>
      </div>
    </header>
  );
}
