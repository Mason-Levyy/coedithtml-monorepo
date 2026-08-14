import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="masthead__inner shell">
        <Wordmark />
        <nav>
          <Link href="/how-it-works/">How it works</Link>
          <Link href="/privacy/">Privacy</Link>
          <Link href="/report/">Report a file</Link>
          <a className="btn btn--small" href="https://app.coedithtml.com">
            Open the app
          </a>
        </nav>
      </div>
    </header>
  );
}
